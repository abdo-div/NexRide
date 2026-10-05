import { resolvePagination } from "../utils/pagination.js";

/**
 * Normalizes `page`/`limit` before a controller runs its list query.
 *
 * Clamping is delegated to the shared resolver so the middleware and the query
 * builders can never disagree about the effective window, and the bounded
 * values are written back onto req.query for downstream APIFeatures consumers.
 */
export const safePagination = (defaultLimit = 20, maxLimit = 100) => {
  return (req, res, next) => {
    const pagination = resolvePagination(req.query, { defaultLimit, maxLimit });

    req.pagination = pagination;

    req.query.page = String(pagination.page);
    req.query.limit = String(pagination.limit);

    next();
  };
};
