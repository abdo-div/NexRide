/**
 * Advanced Mongoose Query Builder
 * Supports filtering, multi-field sorting, field limiting, and bounded pagination.
 */
class APIFeatures {
  /**
   * @param {import('mongoose').Query} query - Mongoose Query object
   * @param {Object} queryString - Express request query object (req.query)
   */
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString || {};
    this.page = 1;
    this.limit = 100;
  }

  /**
   * Cleans input filters and maps query operators (gte, gt, lte, lt, in, regex) to MongoDB syntax.
   */
  filter() {
    // 1) Shallow copy query parameters
    const queryObj = { ...this.queryString };

    // 2) Exclude reserved query controls
    const excludedFields = ["page", "sort", "limit", "fields", "search"];
    excludedFields.forEach((field) => delete queryObj[field]);

    // 3) Prevent Mongo Injection: strip top-level '$' properties from user input
    let queryStr = JSON.stringify(queryObj, (key, value) => {
      if (key.startsWith("$")) return undefined;
      return value;
    });

    // 4) Advanced operator replacement (gte, gt, lte, lt, in, regex)
    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt|in|regex)\b/g,
      (match) => `$${match}`
    );

    const parsedQuery = JSON.parse(queryStr);

    // 5) Apply query to Mongoose instance
    this.query = this.query.find(parsedQuery);

    return this;
  }

  /**
   * Dynamic multi-field sorting engine with secondary fallback.
   */
  sort() {
    if (this.queryString.sort && typeof this.queryString.sort === "string") {
      const sortBy = this.queryString.sort
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean)
        .join(" ");

      this.query = this.query.sort(sortBy);
    } else {
      // Default deterministic sort
      this.query = this.query.sort("-createdAt _id");
    }

    return this;
  }

  /**
   * Selects specific fields to return (projection) and enforces internal field exclusions.
   */
  limitFields() {
    if (this.queryString.fields && typeof this.queryString.fields === "string") {
      const fields = this.queryString.fields
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean)
        .join(" ");

      this.query = this.query.select(fields);
    } else {
      // Exclude Mongoose internal version key by default
      this.query = this.query.select("-__v");
    }

    return this;
  }

  /**
   * Safe, bounded pagination engine with upper limit bounds.
   */
  paginate() {
    const rawPage = parseInt(this.queryString.page, 10);
    const rawLimit = parseInt(this.queryString.limit, 10);

    // Fallbacks with strict upper boundary checks (Max 100 items per page to prevent memory exhaustion)
    this.page = Math.max(1, !isNaN(rawPage) ? rawPage : 1);
    this.limit = Math.min(100, Math.max(1, !isNaN(rawLimit) ? rawLimit : 25));

    const skip = (this.page - 1) * this.limit;

    this.query = this.query.skip(skip).limit(this.limit);

    return this;
  }
}

export default APIFeatures;