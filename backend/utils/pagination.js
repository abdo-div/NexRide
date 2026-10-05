/**
 * Shared pagination primitives for every bounded listing endpoint.
 *
 * A single resolver keeps `page`/`limit` clamping identical across the whole
 * API surface, and one metadata builder guarantees every paginated response
 * exposes the same shape:
 *
 *   { page, limit, total, totalPages, hasNextPage, hasPreviousPage }
 *
 * Values are normalized rather than rejected, which matches the project's
 * existing `safePagination` middleware convention.
 */

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

/**
 * Resolve + clamp the requested page window.
 *
 * - `page` defaults to 1 and can never be below 1.
 * - `limit` defaults to `defaultLimit` and is hard-capped at `maxLimit` so a
 *   client can never force an unbounded scan.
 */
export const resolvePagination = (query = {}, options = {}) => {
  const {
    defaultLimit = DEFAULT_PAGE_LIMIT,
    maxLimit = MAX_PAGE_LIMIT,
  } = options;

  const rawPage = Number.parseInt(query?.page, 10);
  const rawLimit = Number.parseInt(query?.limit, 10);

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  let limit =
    Number.isFinite(rawLimit) && rawLimit >= 1 ? rawLimit : defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  return { page, limit, skip: (page - 1) * limit };
};

/**
 * Build the pagination envelope returned alongside a page of records.
 *
 * `totalPages` is 0 for an empty result set, so `hasNextPage` is false and the
 * frontend can render an unambiguous empty state.
 */
export const buildPaginationMeta = ({ page, limit, total }) => {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 0;
  const totalPages = safeLimit > 0 ? Math.ceil(safeTotal / safeLimit) : 0;

  return {
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    limit: safeLimit,
    total: safeTotal,
    totalPages,
    hasNextPage: safeLimit > 0 && page < totalPages,
    hasPreviousPage: safeLimit > 0 && page > 1 && safeTotal > 0,
  };
};
