import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import * as maintenanceService from "../services/maintenanceService.js";

/**
 * Resolve the tenant for a company maintenance request. For a company session
 * the tenant always comes from the session (protect() => req.tenantId), never
 * from the query string, so an operator cannot pivot the ledger onto another
 * partner's fleet. Only an admin may explicitly target another company via
 * ?companyId=, mirroring getCompanyFleet / getCompanyDashboard.
 */
const resolveTenant = (req, next) => {
  const companyId =
    req.user.role === "company"
      ? req.tenantId || req.user.company
      : req.query.companyId;

  if (req.user.role === "company" && !companyId) {
    next(new AppError("No company tenant is linked to this user account.", 403));
    return null;
  }

  return companyId;
};

/**
 * GET /companies/maintenance — tenant-scoped maintenance-event ledger.
 * Every filter is applied on top of the resolved tenant so a company only ever
 * sees events raised against its own fleet units.
 */
export const getCompanyMaintenanceEvents = catchAsync(async (req, res, next) => {
  const companyId = resolveTenant(req, next);
  if (!companyId) return;

  const { events, pagination } = await maintenanceService.listMaintenanceEvents({
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort,
    search: req.query.search,
    status: req.query.status,
    category: req.query.category,
    priority: req.query.priority,
    companyId,
  });

  res.status(200).json({
    status: "success",
    results: events.length,
    pagination,
    data: { events },
  });
});

/**
 * GET /companies/maintenance/summary — fleet-health deck scoped to one tenant.
 */
export const getCompanyMaintenanceSummary = catchAsync(async (req, res, next) => {
  const companyId = resolveTenant(req, next);
  if (!companyId) return;

  const summary = await maintenanceService.buildMaintenanceSummary(companyId);

  res.status(200).json({
    status: "success",
    data: { summary },
  });
});

/**
 * POST /companies/maintenance — schedule a maintenance event for one of the
 * operator's own vehicles. The vehicle's owning company is authoritative and is
 * re-validated against the resolved tenant before anything is written.
 */
export const createCompanyMaintenance = catchAsync(async (req, res, next) => {
  const companyId = resolveTenant(req, next);
  if (!companyId) return;

  const event = await maintenanceService.createMaintenanceEvent(
    req.body,
    req.user?.id,
    companyId,
  );

  res.status(201).json({
    status: "success",
    data: { event },
  });
});

/**
 * PATCH /companies/maintenance/:id/complete — mark one of the tenant's own
 * events completed; releases the availability lock when no other event is open.
 */
export const completeCompanyMaintenance = catchAsync(async (req, res, next) => {
  const companyId = resolveTenant(req, next);
  if (!companyId) return;

  const event = await maintenanceService.completeMaintenanceEvent(
    req.params.id,
    companyId,
  );

  res.status(200).json({
    status: "success",
    data: { event },
  });
});

/**
 * POST /companies/maintenance/:vehicleId/release — re-enable one of the
 * tenant's own quarantined vehicles, completing every open event on it.
 */
export const releaseCompanyMaintenanceVehicle = catchAsync(async (req, res, next) => {
  const companyId = resolveTenant(req, next);
  if (!companyId) return;

  const result = await maintenanceService.releaseVehicleFromQuarantine(
    req.params.vehicleId,
    companyId,
  );

  res.status(200).json({
    status: "success",
    data: result,
  });
});