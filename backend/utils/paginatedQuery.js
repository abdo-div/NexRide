import APIFeatures from "./APIFeatures.js";
import { buildPaginationMeta } from "./pagination.js";

/**
 * Combines the caller's base filter with the conditions APIFeatures derived from
 * the query string. Neither side is dropped, and neither is allowed to overwrite
 * the other, so `countDocuments` runs against exactly the filter that produced
 * the page.
 */
const mergeFilters = (baseFilter, derivedFilter) => {
  const base = baseFilter && Object.keys(baseFilter).length > 0 ? baseFilter : null;
  const derived =
    derivedFilter && Object.keys(derivedFilter).length > 0 ? derivedFilter : null;

  if (!base) return derived || {};
  if (!derived) return base;
  return { $and: [base, derived] };
};

/**
 * Runs a bounded, deterministically sorted page of a Mongoose query and returns
 * it together with pagination metadata.
 *
 * The total is produced by `countDocuments` against the *same* filter object
 * that produced the rows, so `pagination.total` always reflects exactly the
 * records the caller would reach by paging through the result set. Nothing is
 * ever materialized in memory to be sliced: the window is pushed down to
 * MongoDB via skip/limit.
 *
 * @param {import('mongoose').Model} model
 * @param {Object} [filter] - Base Mongo filter (tenant scoping, visibility…)
 * @param {Object} [queryParams] - Express req.query
 * @param {Object} [options]
 * @param {string[]} [options.searchFields] - Allowlist for the `search` term
 * @param {string[]} [options.excludeFields] - Query keys already applied to `filter`
 * @param {number} [options.defaultLimit]
 * @param {number} [options.maxLimit]
 * @param {string|Object} [options.populate] - Mongoose populate target(s)
 * @param {string|Object} [options.select]
 */
export const runPaginatedQuery = async (model, filter = {}, queryParams = {}, options = {}) => {
  const {
    searchFields = [],
    excludeFields = [],
    defaultLimit,
    maxLimit,
    populate,
    select,
  } = options;

  const features = new APIFeatures(model.find(filter), queryParams, {
    searchFields,
    excludeFields,
    defaultLimit,
    maxLimit,
  })
    .filter()
    .sort();

  if (select) {
    features.query = features.query.select(select);
  } else {
    features.limitFields();
  }

  features.paginate();

  // The count must see *both* the caller's base filter (tenant scope,
  // visibility rules, derived states) and whatever APIFeatures added from the
  // query string. Counting only one of the two would report a total that does
  // not match the rows the caller can actually page through.
  const countFilter = mergeFilters(filter, features.filterQuery);
  const countQuery = model.countDocuments(countFilter);

  const paged = features.query;
  const [docs, total] = await Promise.all([
    populate ? paged.populate(populate) : paged,
    countQuery,
  ]);

  return {
    docs,
    pagination: buildPaginationMeta({
      page: features.page,
      limit: features.limit,
      total,
    }),
  };
};
