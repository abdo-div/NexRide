export const safePagination = (defaultLimit = 20, maxLimit = 100) => {
  return (req, res, next) => {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || defaultLimit;

    if (page < 1) page = 1;
    if (limit < 1) limit = defaultLimit;
    if (limit > maxLimit) limit = maxLimit; // Hard limit cap

    req.pagination = {
      page,
      limit,
      skip: (page - 1) * limit,
    };

    // Normalize the live request query so downstream builders (APIFeatures)
    // consume the bounded values instead of raw user input.
    req.query.page = String(page);
    req.query.limit = String(limit);

    next();
  };
};
