import mongoose from "mongoose";
import Vehicle from "../models/vehicle_model.js";
import AppError from "../utils/appError.js";
import MaintenanceEvent, {
  dispatchStatusOf,
} from "../models/Maintenance_model.js";

const EVENT_POPULATE =
  "make model year type city pickupLocation operationalStatus photos dailyPrice companyId";

/**
 * Fleet Health summary — every figure is computed live from the real Vehicle
 * registry and the MaintenanceEvent ledger. Overdue is derived from scheduled
 * events that have blown past their estimated return date; nothing is mocked.
 */
export const buildMaintenanceSummary = async () => {
  const totalFleet = await Vehicle.countDocuments({});

  const statusCounts = await Vehicle.aggregate([
    {
      $group: {
        _id: "$operationalStatus",
        count: { $sum: 1 },
      },
    },
  ]);
  const byStatus = Object.fromEntries(
    statusCounts.map((row) => [row._id, row.count]),
  );
  const inServiceVehicles = byStatus.MAINTENANCE ?? 0;
  const unavailableFleet = byStatus.UNAVAILABLE ?? 0;

  const now = Date.now();
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [stats] = await MaintenanceEvent.aggregate([
    {
      $group: {
        _id: null,
        inProgressEvents: {
          $sum: { $cond: [{ $eq: ["$status", "IN_PROGRESS"] }, 1, 0] },
        },
        completed14d: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "COMPLETED"] },
                  {
                    $gte: [
                      "$completedDate",
                      new Date(now - 14 * 86400000),
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        mtdCost: {
          $sum: {
            $cond: [
              { $gte: [{ $ifNull: ["$intakeDate", "$createdAt"] }, startOfMonth] },
              "$estCost",
              0,
            ],
          },
        },
        mtdVehicles: { $addToSet: "$vehicleId" },
      },
    },
  ]);

  const pending = await MaintenanceEvent.find({
    status: { $ne: "COMPLETED" },
  });

  const scheduledNext7d = pending.filter((e) => {
    if (e.status !== "SCHEDULED" || !e.estReturnDate) return false;
    const at = new Date(e.estReturnDate).getTime();
    return at >= Date.now() && at <= Date.now() + 7 * 86400000;
  }).length;

  const overdueEvents = pending.filter(
    (e) => e.estReturnDate && new Date(e.estReturnDate).getTime() < Date.now(),
  );

  const quarantinedUnits = new Set(pending.map((e) => String(e.vehicleId))).size;

  const mtdCost = stats?.mtdCost ?? 0;
  const mtdVehicles = stats?.mtdVehicles ?? [];

  return {
    totalFleet,
    inServiceVehicles,
    inServicePct: totalFleet > 0 ? (inServiceVehicles / totalFleet) * 100 : 0,
    scheduledNext7d,
    overdueCount: overdueEvents.length,
    overdueVehicles: new Set(overdueEvents.map((e) => String(e.vehicleId))).size,
    unavailableFleet,
    quarantinedUnits,
    mtdCost,
    avgCostPerVehicle:
      mtdVehicles.length > 0 ? mtdCost / mtdVehicles.length : 0,
    inProgress: stats?.inProgressEvents ?? 0,
    completed14d: stats?.completed14d ?? 0,
    monthLabel: new Intl.DateTimeFormat("en", {
      month: "short",
      year: "2-digit",
    }).format(new Date()),
  };
};

const applyDispatchFilter = (events, status) => {
  if (!status || status === "ALL") return events;
  return events.filter((e) => dispatchStatusOf(e) === status);
};

const applyHubFilter = (events, hub) => {
  if (!hub) return events;
  return events.filter((e) => {
    const vehicle = e.vehicleId;
    const company = typeof e.companyId === "object" ? e.companyId : null;
    const city = typeof vehicle === "object"
      ? vehicle.city
      : null;
    return (
      (city ?? "").toLocaleLowerCase() === hub.toLocaleLowerCase() ||
      (company?.city ?? "").toLocaleLowerCase() === hub.toLocaleLowerCase()
    );
  });
};

/**
 * Maintenance-event ledger. DB-side filters first (category / priority /
 * partner / stored status), then the derived OVERDUE dispatch state and the
 * hub scoping in JS because those need the populated vehicle/company refs.
 */
export const listMaintenanceEvents = async (query = {}) => {
  const dbFilter = {};
  if (query.category && query.category !== "ALL") {
    dbFilter.category = query.category;
  }
  if (query.priority && query.priority !== "ALL") {
    dbFilter.priority = query.priority;
  }
  if (query.companyId && query.companyId !== "ALL") {
    dbFilter.companyId = new mongoose.Types.ObjectId(query.companyId);
  }
  if (
    query.status &&
    query.status !== "ALL" &&
    query.status !== "OVERDUE"
  ) {
    dbFilter.status = query.status;
  }

  const limit = Math.min(Number(query.limit) || 100, 100);
  let events = await MaintenanceEvent.find(dbFilter)
    .sort("-createdAt")
    .limit(limit)
    .populate("vehicleId", EVENT_POPULATE)
    .populate("companyId", "name city phone logo");

  if (query.status === "OVERDUE") {
    events = applyDispatchFilter(events, "OVERDUE");
  }
  events = applyHubFilter(events, query.hub || "");

  return events.map((event) => ({
    ...event.toObject(),
    dispatchStatus: dispatchStatusOf(event),
  }));
};

const populateEvent = (event) =>
  MaintenanceEvent.findById(event.id ?? event._id)
    .populate("vehicleId", EVENT_POPULATE)
    .populate("companyId", "name city phone logo");

export const createMaintenanceEvent = async (payload, userId) => {
  const vehicle = await Vehicle.findById(payload.vehicleId);
  if (!vehicle) {
    throw new AppError("Vehicle not found", 404);
  }

  const event = await MaintenanceEvent.create({
    ...payload,
    companyId: vehicle.companyId,
    createdBy: userId ?? null,
  });

  // Booking engine hard-lock: any non-completed event takes the vehicle off
  // the AVAILABLE marketplace.
  if (payload.status !== "COMPLETED" && vehicle.operationalStatus === "AVAILABLE") {
    vehicle.operationalStatus = "MAINTENANCE";
    await vehicle.save();
  }

  const populated = await populateEvent(event);
  return {
    ...populated.toObject(),
    dispatchStatus: dispatchStatusOf(populated),
  };
};

export const completeMaintenanceEvent = async (eventId) => {
  const event = await MaintenanceEvent.findById(eventId);
  if (!event) {
    throw new AppError("Maintenance event not found", 404);
  }

  if (event.status !== "COMPLETED") {
    event.status = "COMPLETED";
    event.completedDate = event.completedDate ?? new Date();
    await event.save();

    const vehicle = await Vehicle.findById(event.vehicleId);
    if (vehicle && vehicle.operationalStatus !== "AVAILABLE") {
      vehicle.operationalStatus = "AVAILABLE";
      await vehicle.save();
    }
  }

  const populated = await populateEvent(event);
  return {
    ...populated.toObject(),
    dispatchStatus: dispatchStatusOf(populated),
  };
};

/**
 * Admin clearance ("Verify & Re-Enable Fleet"): releases every open event for
 * the unit and lifts the availability lock, returning the vehicle to the
 * rental marketplace. High-privilege action guarded by the admin gate.
 */
export const releaseVehicleFromQuarantine = async (vehicleId) => {
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    throw new AppError("Vehicle not found", 404);
  }

  const result = await MaintenanceEvent.updateMany(
    { vehicleId: vehicle._id, status: { $ne: "COMPLETED" } },
    { $set: { status: "COMPLETED", completedDate: new Date() } },
  );

  vehicle.operationalStatus = "AVAILABLE";
  await vehicle.save();

  return { released: result.modifiedCount, vehicle };
};