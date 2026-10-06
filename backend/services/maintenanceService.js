import mongoose from "mongoose";
import Vehicle from "../models/vehicle_model.js";
import Company from "../models/Company_model.js";
import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import AppError from "../utils/appError.js";
import { runPaginatedQuery } from "../utils/paginatedQuery.js";
import MaintenanceEvent, {
  dispatchStatusOf,
} from "../models/Maintenance_model.js";
import {
  DATE_BLOCKING_BOOKING_STATUSES,
  buildDateOverlapFilter,
} from "../utils/bookingStatus.js";
import { notifyBookingCancellation } from "./bookingService.js";

const EVENT_POPULATE =
  "make model year type city pickupLocation operationalStatus photos dailyPrice companyId";

const MAINTENANCE_SEARCH_FIELDS = [
  "category",
  "priority",
  "status",
  "triggerReason",
  "detail",
  "workshop",
  "technician",
];

// P1-2b: what counts as a hard conflict that must block maintenance scheduling,
// versus an unpaid/unconfirmed reservation that may be auto-cancelled.
const HARD_CONFLICT_BOOKING_STATUSES = ["PAID", "CONFIRMED", "ACTIVE"];
const AUTO_CANCEL_BOOKING_STATUSES = ["PENDING_PAYMENT"];

/**
 * Query keys that `listMaintenanceEvents` interprets itself (the OVERDUE derived
 * state and the hub scope) or that it already expressed in Mongo conditions.
 * They are removed from the raw passthrough filter.
 */
const MAINTENANCE_DERIVED_FILTER_FIELDS = [
  "category",
  "priority",
  "companyId",
  "status",
  "hub",
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

/**
 * DB-side equivalent of the former in-memory `applyHubFilter`: an event belongs
 * to a hub when either its vehicle or its owning company is based there.
 * Resolving the ids up front keeps the scoping inside MongoDB so the window can
 * still be paginated and counted without loading the ledger.
 */
const buildHubFilter = async (hub) => {
  if (!hub) return null;

  const pattern = new RegExp(escapeRegExp(String(hub)), "i");
  const [vehicleIds, companyIds] = await Promise.all([
    Vehicle.distinct("_id", { city: pattern }),
    Company.distinct("_id", { city: pattern }),
  ]);

  return {
    $or: [{ vehicleId: { $in: vehicleIds } }, { companyId: { $in: companyIds } }],
  };
};

/**
 * Maintenance-event ledger. Every filter is now expressed as a Mongo query —
 * including the derived OVERDUE state and the hub scope — so the page, the total
 * count and the OVERDUE/hub filters can no longer drift apart. Previously the
 * 100-row cap was applied *before* those derived filters ran, which truncated the
 * ledger and produced meaningless counts.
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

  if (query.status && query.status !== "ALL") {
    if (query.status === "OVERDUE") {
      // Derived state: an open event past its estimated return date.
      dbFilter.status = { $ne: "COMPLETED" };
      dbFilter.estReturnDate = { $ne: null, $lt: new Date() };
    } else {
      dbFilter.status = query.status;
    }
  }

  const hubFilter = await buildHubFilter(query.hub);

  const { docs, pagination } = await runPaginatedQuery(
    MaintenanceEvent,
    hubFilter ? { $and: [dbFilter, hubFilter] } : dbFilter,
    query,
    {
      searchFields: MAINTENANCE_SEARCH_FIELDS,
      // These are already translated into Mongo conditions above. Re-applying
      // them as raw field filters would re-add the literal "OVERDUE" status (a
      // value the schema never stores) and the non-existent `hub` field, which
      // silently emptied the result set and broke the total.
      excludeFields: MAINTENANCE_DERIVED_FILTER_FIELDS,
      populate: [
        { path: "vehicleId", select: EVENT_POPULATE },
        { path: "companyId", select: "name city phone logo" },
      ],
    },
  );

  return {
    events: docs.map((event) => ({
      ...event.toObject(),
      dispatchStatus: dispatchStatusOf(event),
    })),
    pagination,
  };
};

const populateEvent = (event) =>
  MaintenanceEvent.findById(event.id ?? event._id)
    .populate("vehicleId", EVENT_POPULATE)
    .populate("companyId", "name city phone logo");

/**
 * P1-2b: bookings that conflict with a maintenance window.
 *
 * The window is half-open like rentals: everything starting before the return
 * date and ending after the intake date. An event with no estimated return is
 * treated as open-ended (any future booking conflicts). Only
 * DATE_BLOCKING_BOOKING_STATUSES hold dates, so COMPLETED/CANCELLED/EXPIRED
 * rows are ignored.
 */
const findMaintenanceConflicts = (vehicleId, windowStart, windowEnd) =>
  Booking.find({
    vehicleId,
    bookingStatus: { $in: DATE_BLOCKING_BOOKING_STATUSES },
    ...(windowEnd
      ? { $or: buildDateOverlapFilter(windowStart, windowEnd) }
      : { endDate: { $gt: windowStart } }),
  });

export const createMaintenanceEvent = async (payload, userId) => {
  const vehicle = await Vehicle.findById(payload.vehicleId);
  if (!vehicle) {
    throw new AppError("Vehicle not found", 404);
  }

  if (payload.status !== "COMPLETED") {
    const windowStart = payload.intakeDate
      ? new Date(payload.intakeDate)
      : new Date();
    const windowEnd = payload.estReturnDate
      ? new Date(payload.estReturnDate)
      : null;

    const conflicts = await findMaintenanceConflicts(
      vehicle._id,
      windowStart,
      windowEnd,
    );

    // Paid / confirmed / active rentals cannot be bumped; reject scheduling
    // rather than strand a customer's confirmed trip.
    const hardConflicts = conflicts.filter((booking) =>
      HARD_CONFLICT_BOOKING_STATUSES.includes(booking.bookingStatus),
    );
    if (hardConflicts.length > 0) {
      const statuses = [
        ...new Set(hardConflicts.map((b) => b.bookingStatus)),
      ].join(", ");
      throw new AppError(
        `Vehicle has ${hardConflicts.length} active/confirmed booking(s) (${statuses}) overlapping the maintenance window. Resolve or reschedule them before scheduling maintenance.`,
        409,
      );
    }

    // Unpaid, unconfirmed reservations are safe to cancel outright - they were
    // only holding dates, no money has moved. Nudge the customer by email.
    for (const booking of conflicts.filter((booking) =>
      AUTO_CANCEL_BOOKING_STATUSES.includes(booking.bookingStatus),
    )) {
      booking.bookingStatus = "CANCELLED";
      booking.paymentStatus = "UNPAID";
      booking.cancelledBy = userId ?? null;
      booking.cancelledAt = new Date();
      booking.cancellationReason =
        "Cancelled automatically: vehicle scheduled for maintenance.";
      await booking.save({ validateBeforeSave: false });

      // Retire any dangling PENDING cash ledger row for the cancelled booking.
      await Payment.updateMany(
        { bookingId: booking._id, status: "PENDING" },
        {
          $set: {
            status: "FAILED",
            refundReason: "Booking cancelled for scheduled maintenance",
          },
        },
      );

      notifyBookingCancellation(booking, "scheduled maintenance");
    }
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
      // A second open event on the same unit keeps the maintenance lock;
      // completing one event must not return a still-quarantined vehicle to
      // the market.
      const otherOpenEvent = await MaintenanceEvent.exists({
        vehicleId: vehicle._id,
        _id: { $ne: event._id },
        status: { $ne: "COMPLETED" },
      });
      if (!otherOpenEvent) {
        vehicle.operationalStatus = "AVAILABLE";
        await vehicle.save();
      }
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