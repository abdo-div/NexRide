import catchAsync from "../utils/catchAsync.js";
import * as maintenanceService from "../services/maintenanceService.js";

export const getMaintenanceSummary = catchAsync(async (req, res, next) => {
  const summary = await maintenanceService.buildMaintenanceSummary();

  res.status(200).json({
    status: "success",
    data: { summary },
  });
});

export const getMaintenanceEvents = catchAsync(async (req, res, next) => {
  const { events, pagination } = await maintenanceService.listMaintenanceEvents({
    ...req.query,
    hub: req.query.hub,
  });

  res.status(200).json({
    status: "success",
    results: events.length,
    pagination,
    data: { events },
  });
});

export const createMaintenance = catchAsync(async (req, res, next) => {
  const event = await maintenanceService.createMaintenanceEvent(
    req.body,
    req.user?.id,
  );

  res.status(201).json({
    status: "success",
    data: { event },
  });
});

export const completeMaintenance = catchAsync(async (req, res, next) => {
  const event = await maintenanceService.completeMaintenanceEvent(
    req.params.id,
  );

  res.status(200).json({
    status: "success",
    data: { event },
  });
});

export const releaseMaintenanceVehicle = catchAsync(async (req, res, next) => {
  const result = await maintenanceService.releaseVehicleFromQuarantine(
    req.params.vehicleId,
  );

  res.status(200).json({
    status: "success",
    data: result,
  });
});