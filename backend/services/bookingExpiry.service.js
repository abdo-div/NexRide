import Booking from "../models/booking_model.js";
import PlatformSettings from "../models/PlatformSettings_model.js";
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
  const raw = process.env.RESERVATION_EXPIRY_MINUTES;

  if (raw === undefined || raw === "") {
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
  }

  const parsed = Number(raw);
  if (Number.isFinite(parsed)) return clampExpiryMinutes(parsed);

  logger.warn(
    { value: raw },
    "RESERVATION_EXPIRY_MINUTES is not a number; using default",
  );
  return DEFAULT_EXPIRY_MINUTES;
};

/**
 * Flip PENDING_PAYMENT bookings whose checkout was abandoned to EXPIRED so
 * their dates become bookable again.
 *
 * Guarding on `paymentStatus: UNPAID` keeps a booking that is mid-payment out
 * of scope even if the row is briefly older than the window. Returns the number
 * of reservations released.
 *
 * The models are injectable so this can be tested without a database.
 */
export const expireStalePendingBookings = async ({
  now = new Date(),
  bookings = Booking,
  platformSettings = PlatformSettings,
} = {}) => {
  const expiryMinutes = await readConfiguredExpiryMinutes(platformSettings);
  const cutoff = new Date(now.getTime() - expiryMinutes * 60 * 1000);

  const result = await bookings.updateMany(
    {
      bookingStatus: "PENDING_PAYMENT",
      paymentStatus: "UNPAID",
      createdAt: { $lt: cutoff },
    },
    { $set: { bookingStatus: "EXPIRED" } },
  );

  if (result.modifiedCount > 0) {
    logger.info(
      { expired: result.modifiedCount, expiryMinutes, cutoff },
      "Expired stale PENDING_PAYMENT bookings",
    );
  }

  return result.modifiedCount;
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
