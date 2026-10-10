import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { buildCompanyBookings } from "../services/companyBookingsService.js";

/**
 * GET /companies/bookings — tenant-scoped bookings & dispatches register for
 * the authenticated fleet operator.
 *
 * The tenant is always resolved from the session (protect() => req.tenantId),
 * never from the query string, so a company session cannot pivot the register
 * onto another operator's bookings. Only an admin may explicitly target
 * another company via ?companyId=, mirroring getCompanyDashboard and
 * getCompanyPayoutSummary.
 */
export const getCompanyBookings = catchAsync(async (req, res, next) => {
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

  const bookings = await buildCompanyBookings({
    companyId,
    view: req.query.view,
    search: req.query.search,
    status: req.query.status,
    payment: req.query.payment,
    vehicleId: req.query.vehicleId,
    fromDate: req.query.fromDate,
    page: req.query.page,
    limit: req.query.limit,
  });

  res.status(200).json({
    status: "success",
    data: bookings,
  });
});