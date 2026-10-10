import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { buildCompanyDashboard } from "../services/companyDashboardService.js";

/**
 * GET /companies/dashboard — tenant-scoped ops dashboard for the authenticated
 * fleet operator.
 *
 * The tenant is always resolved from the session (protect() => req.tenantId),
 * never from the query string, so a company session cannot pivot the summary to
 * another operator's ledger. Only an admin may explicitly target another
 * company via ?companyId=, mirroring getCompanyPayoutSummary.
 */
export const getCompanyDashboard = catchAsync(async (req, res, next) => {
  const companyId =
    req.user.role === "company"
      ? req.tenantId || req.user.company
      : req.query.companyId;

  // A company account without a resolvable tenant must fail closed: a null
  // companyId would let the service aggregation span the whole platform.
  if (req.user.role === "company" && !companyId) {
    return next(
      new AppError("No company tenant is linked to this user account.", 403),
    );
  }

  const dashboard = await buildCompanyDashboard({
    companyId,
    period: req.query.period,
  });

  res.status(200).json({
    status: "success",
    data: dashboard,
  });
});