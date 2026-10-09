import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import Vehicle from "../models/vehicle_model.js";
import MaintenanceEvent from "../models/Maintenance_model.js";
import PlatformSettings from "../models/PlatformSettings_model.js";
import { releaseVehicleHold } from "./reservationHold.service.js";
import logger from "../utils/logger.js";

// Abandoned checkouts must not reserve a vehicle forever. This window bounds
// how long a PENDING_PAYMENT booking holds dates before the reaper releases
// them. It is deliberately >= the 10 minute Redis checkout hold so the date
// reservation always outlives the hold that gated the checkout.
const DEFAULT_EXPIRY_MINUTES = 30;
const MIN_EXPIRY_MINUTES = 10;
const MAX_EXPIRY_MINUTES = 120;
const REAPER_INTERVAL_MS = 60 * 1000;

const clampExpiryMinutes = (minutes) =>
  Math.min(
    MAX_EXPIRY_MINUTES,
    Math.max(MIN_EXPIRY_MINUTES, Math.round(minutes)),
  );

// Platform admins pick reservationExpiryMinutes from a fixed set
// (10/30/60/120). Read it directly instead of through settingsService, whose
// reader creates a default document on first call - not a side effect a
// background timer should have.
const readConfiguredExpiryMinutes = async (platformSettings) => {
  try {
    const settings = await platformSettings
      .findOne({ key: "platform" })
      .select("booking.reservationExpiryMinutes")
      .lean();
    const value = settings?.booking?.reservationExpiryMinutes;
    if (typeof value === "number" && Number.isFinite(value)) {
      return clampExpiryMinutes(value);
    }
  } catch (err) {
    logger.warn(
      { err: err.message },
      "Could not read reservationExpiryMinutes; using default",
    );
  }
  return DEFAULT_EXPIRY_MINUTES;
};

/**
 * Flip PENDING_PAYMENT bookings whose checkout was abandoned to EXPIRED so
 * their dates become bookable again, and reconcile everything that a stale
 * reservation pinned down.
 *
 * Guarding on `paymentStatus: UNPAID` keeps a booking that is mid-payment out
 * of scope even if the row is briefly older than the window. Each candidate is
 * processed inside its own Mongo transaction:
 *
 *   1. the booking is re-read inside the transaction - if a customer finished
 *      paying between the sweep query and now, the booking is skipped;
 *   2. `bookingStatus` -> "EXPIRED" (dates stop blocking collisions);
 *   3. any still-PENDING Payment ledger row -> "EXPIRED" so a never-collected
 *      intent cannot dangle in the ledger forever;
 *   4. `Vehicle.operationalStatus` -> "AVAILABLE" - unless an open maintenance
 *      event quarantines the unit, in which case the maintenance lock wins;
 *   5. after commit, the Redis checkout hold (`hold:vehicle:<id>`) is cleared
 *      best-effort so a late checkout cannot resurrect the reservation.
 *
 * Models and side effects are injectable so the sweep is testable without a
 * database or Redis. Returns the number of reservations released.
 */
export const expireStalePendingBookings = async ({
  now = new Date(),
  bookings = Booking,
  platformSettings = PlatformSettings,
  payments = Payment,
  vehicles = Vehicle,
  maintenanceEvents = MaintenanceEvent,
  releaseHold = releaseVehicleHold,
  startSession = mongoose.startSession,
} = {}) => {
  const expiryMinutes = await readConfiguredExpiryMinutes(platformSettings);
  const cutoff = new Date(now.getTime() - expiryMinutes * 60 * 1000);

  const staleBookings = await bookings.find({
    bookingStatus: "PENDING_PAYMENT",
    paymentStatus: "UNPAID",
    createdAt: { $lt: cutoff },
  });

  let expiredCount = 0;

  for (const stale of staleBookings) {
    const vehicleId = stale.vehicleId?._id ?? stale.vehicleId;

    if (!vehicleId) {
      logger.warn(
        { bookingId: stale._id },
        "Stale booking has no vehicle; skipping reaper sweep",
      );
      continue;
    }

    const session = await startSession();
    session.startTransaction();

    try {
      // Re-read under the transaction so a booking that was paid or advanced
      // (by the cash counter or a gateway callback) after the sweep query is
      // never clobbered with an EXPIRED write.
      const booking = await bookings.findById(stale._id).session(session);
      if (
        !booking ||
        booking.bookingStatus !== "PENDING_PAYMENT" ||
        booking.paymentStatus !== "UNPAID"
      ) {
        await session.abortTransaction();
        session.endSession();
        continue;
      }

      booking.bookingStatus = "EXPIRED";
      await booking.save({ session, validateBeforeSave: false });

      await payments.updateMany(
        { bookingId: booking._id, status: "PENDING" },
        { $set: { status: "EXPIRED" } },
        { session },
      );

      // Never release a unit that an operator quarantined for maintenance.
      const openMaintenance = await maintenanceEvents
        .exists({ vehicleId, status: { $ne: "COMPLETED" } })
        .session(session);

      if (!openMaintenance) {
        await vehicles.updateOne(
          { _id: vehicleId },
          { $set: { operationalStatus: "AVAILABLE" } },
          { session },
        );
      }

      await session.commitTransaction();
      session.endSession();
      expiredCount += 1;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      // One poisoned row must not sink the whole sweep.
      logger.warn(
        { bookingId: stale._id, err: error.message },
        "Failed to expire a stale booking; skipping",
      );
    }

    // Redis holds live outside Mongo. Clearing them is best-effort: a leftover
    // key self-expires after its 10 minute TTL anyway, so a failure here must
    // not fail the sweep.
    try {
      await releaseHold(vehicleId);
    } catch (error) {
      logger.warn(
        { vehicleId, err: error.message },
        "Could not clear the vehicle checkout hold",
      );
    }
  }

  if (expiredCount > 0) {
    logger.info(
      { expired: expiredCount, expiryMinutes, cutoff },
      "Expired stale PENDING_PAYMENT bookings",
    );
  }

  return expiredCount;
};

let reaperTimer = null;
let sweepInFlight = false;

/**
 * Run the expiry sweep on an interval. The timer is unref'd so it never keeps
 * the process alive, and the sweep is guarded against overlap so a slow query
 * cannot stack up. Failures are logged, never thrown: a reaper error must not
 * take the API down.
 */
export const startBookingExpiryReaper = ({
  intervalMs = REAPER_INTERVAL_MS,
} = {}) => {
  if (reaperTimer) return reaperTimer;

  const sweep = async () => {
    if (sweepInFlight) return;
    sweepInFlight = true;
    try {
      await expireStalePendingBookings();
    } catch (err) {
      logger.error({ err: err.message }, "Booking expiry reaper sweep failed");
    } finally {
      sweepInFlight = false;
    }
  };

  reaperTimer = setInterval(sweep, intervalMs);
  reaperTimer.unref?.();

  // Sweep once at boot so reservations abandoned during a restart or downtime
  // are released without waiting a full interval.
  sweep();

  logger.info({ intervalMs }, "Booking expiry reaper started");
  return reaperTimer;
};

export const stopBookingExpiryReaper = () => {
  if (!reaperTimer) return;
  clearInterval(reaperTimer);
  reaperTimer = null;
  logger.info("Booking expiry reaper stopped");
};

export const __testing = { DEFAULT_EXPIRY_MINUTES, clampExpiryMinutes };
