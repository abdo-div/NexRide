import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { buildCompanyFleet } from "../services/companyFleetService.js";

/**
 * GET /companies/fleet — tenant-scoped fleet register for the authenticated
 * fleet operator.
 *
 * The tenant is always resolved from the session (protect() => req.tenantId),
 * never from the query string, so a company session cannot pivot the register
 * onto another operator's fleet. Only an admin may explicitly target another
 * company via ?companyId=, mirroring getCompanyDashboard and
 * getCompanyBookings.
 */
export const getCompanyFleet = catchAsync(async (req, res, next) => {
  const companyId =
    req.user.role === "company"
      ? req.tenantId || req.user.company
      : req.query.companyId;

  // A company account without a resolvable tenant must fail closed: a null
  // companyId would let the aggregation span the whole platform.
  if (req.user.role === "company" && !companyId) {
    return next(
      new AppError("No company tenant is linked to this user account.", 403),
    );
  }

  const fleet = await buildCompanyFleet({
    companyId,
    search: req.query.search,
    status: req.query.status,
    category: req.query.category,
    transmission: req.query.transmission,
    fuel: req.query.fuel,
    city: req.query.city,
    page: req.query.page,
    limit: req.query.limit,
  });

  res.status(200).json({
    status: "success",
    data: fleet,
  });
});