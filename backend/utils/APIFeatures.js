import { resolvePagination } from "./pagination.js";

/**
 * Advanced Mongoose Query Builder
 * Supports filtering, multi-field sorting, field limiting, and bounded pagination.
 *
 * The built filter is kept on `filterQuery` so a caller can run an exact
 * `countDocuments` against the very same conditions as the returned page —
 * which is what makes `pagination.total` trustworthy.
 */
class APIFeatures {
  /**
   * @param {import('mongoose').Query} query - Mongoose Query object
   * @param {Object} queryString - Express request query object (req.query)
   * @param {Object} [options]
   * @param {string[]} [options.searchFields] - Fields the `search` term may match
   * @param {string[]} [options.excludeFields] - Query keys that are consumed
   *   outside of APIFeatures (e.g. a filter the caller already translated into a
   *   Mongo condition). They must never be re-applied as raw field filters.
   * @param {number} [options.defaultLimit]
   * @param {number} [options.maxLimit]
   */
  constructor(query, queryString, options = {}) {
    this.query = query;
    this.queryString = queryString || {};
    this.searchFields = options.searchFields || [];
    this.excludeFields = options.excludeFields || [];
    this.page = 1;
    this.limit = 100;
    this.filterQuery = {};
    // The default of 25 is the long-standing fallback for the public/company
    // listings that do not run through `safePagination`; admin routes always
    // arrive with an explicit, already-clamped limit from that middleware.
    this.defaultLimit = options.defaultLimit ?? 25;
    this.maxLimit = options.maxLimit;
  }

  /**
   * Cleans input filters and maps query operators (gte, gt, lte, lt, in, regex) to MongoDB syntax.
   */
  filter() {
    // 1) Shallow copy query parameters
    const queryObj = { ...this.queryString };

    // 2) Exclude reserved query controls
    const excludedFields = [
      "page",
      "sort",
      "limit",
      "fields",
      "search",
      ...this.excludeFields,
    ];
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

    // 5) Free-text search across an explicit, per-endpoint field allowlist
    this.applySearch(parsedQuery);

    this.filterQuery = parsedQuery;

    // 6) Apply query to Mongoose instance
    this.query = this.query.find(parsedQuery);

    return this;
  }

  /**
   * Case-insensitive partial match over the endpoint's declared search fields.
   * Ignored when no allowlist is declared, so `search` can never become an
   * injection vector or an unbounded scan.
   */
  applySearch(parsedQuery) {
    const term = this.queryString.search;
    if (typeof term !== "string" || term.trim() === "") return;
    if (this.searchFields.length === 0) return;

    const pattern = new RegExp(escapeRegExp(term.trim()), "i");
    const clauses = this.searchFields.map((field) => ({ [field]: pattern }));

    // Combine with any caller-supplied $and clauses instead of overwriting them.
    const existing = Array.isArray(parsedQuery.$and) ? parsedQuery.$and : [];
    parsedQuery.$and = [
      ...existing,
      ...(clauses.length > 1 ? [{ $or: clauses }] : clauses),
    ];
  }

  /**
   * Dynamic multi-field sorting engine with secondary fallback.
   * A `_id` tiebreaker is always appended so every page of a listing is
   * deterministically ordered and records can never repeat across pages.
   */
  sort() {
    if (this.queryString.sort && typeof this.queryString.sort === "string") {
      const sortBy = this.queryString.sort
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean)
        .join(" ");

      this.query = this.query.sort(`${sortBy} _id`);
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
   *
   * The default of 25 is the long-standing fallback for the public/company
   * listings that do not run through `safePagination`; admin routes always
   * arrive with an explicit, already-clamped limit from that middleware.
   */
  paginate() {
    const { page, limit, skip } = resolvePagination(this.queryString, {
      defaultLimit: this.defaultLimit,
      maxLimit: this.maxLimit,
    });

    this.page = page;
    this.limit = limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default APIFeatures;
