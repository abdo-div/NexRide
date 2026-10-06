import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { buildCompanyVehicleDetail } from "../services/companyVehicleService.js";

/**
 * GET /companies/fleet/:vehicleId — tenant-scoped vehicle dossier for the
 * authenticated fleet operator.
 *
 * The tenant is always resolved from the session (protect() => req.tenantId),
 * never from the body or query string, and the service re-scopes every query to
 * that tenant, so a company session cannot read another operator's vehicle by
 * guessing its id. Only an admin may explicitly target another company's unit.
 */
export const getCompanyVehicleDetail = catchAsync(async (req, res, next) => {
  const companyId =
    req.user.role === "company"
      ? req.tenantId || req.user.company
      : req.query.companyId;

  if (req.user.role === "company" && !companyId) {
    return next(
      new AppError("No company tenant is linked to this user account.", 403),
    );
  }

  const dossier = await buildCompanyVehicleDetail({
    companyId,
    vehicleId: req.params.vehicleId,
    search: req.query.search,
    page: req.query.page,
    limit: req.query.limit,
  });

  res.status(200).json({
    status: "success",
    data: dossier,
  });
});