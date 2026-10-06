import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Vehicle from "../models/vehicle_model.js";
import Company from "../models/Company_model.js";
import Payment from "../models/payment_model.js";
import MaintenanceEvent from "../models/Maintenance_model.js";
import AppError from "../utils/appError.js";
import * as factory from "./serviceFactory.js";
import { runPaginatedQuery } from "../utils/paginatedQuery.js";
import Email from "../utils/email.js";
import {
  DATE_BLOCKING_BOOKING_STATUSES,
  buildDateOverlapFilter,
} from "../utils/bookingStatus.js";

// The search allowlist is deliberately limited to fields stored on the booking
// document. Populated references (vehicle make/model, customer and partner
// names) cannot be regex-matched from the parent collection, so searching by
// those stays the client's registry job.
const BOOKING_SEARCH_FIELDS = ["pickupLocation", "bookingStatus", "paymentStatus"];

// `hub` is resolved into real Mongo conditions below, so it must never be
// re-applied as a literal field filter (the schema has no `hub` field).
const BOOKING_DERIVED_FILTER_FIELDS = ["hub"];

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * DB-side equivalent of the former in-memory hub scoping: a booking belongs to a
 * hub when its partner company is based there or when the pickup location names
 * the hub. Resolving the partner ids up front keeps the scope inside MongoDB, so
 * the window can still be paginated and counted without loading the register.
 */
const buildBookingHubFilter = async (hub) => {
  if (!hub) return null;

  const pattern = new RegExp(escapeRegExp(hub), "i");
  const companyIds = await Company.distinct("_id", { city: pattern });

  return {
    $or: [{ companyId: { $in: companyIds } }, { pickupLocation: pattern }],
  };
};

/**
 * Paginated booking register for administration.
 *
 * Filters, the hub scope and ordering all run in MongoDB, so the returned page
 * and `pagination.total` describe the same result set — previously the 100-row
 * window was loaded first and the hub/derived filters ran on top of it, which
 * both truncated the register and produced misleading counts.
 */
export const listBookings = async (query = {}) => {
  const hubFilter = await buildBookingHubFilter(query.hub);

  return await runPaginatedQuery(
    Booking,
    hubFilter ?? {},
    query,
    {
      searchFields: BOOKING_SEARCH_FIELDS,
      excludeFields: BOOKING_DERIVED_FILTER_FIELDS,
    },
  );
};

export const getAllBookings = factory.getAll(Booking);
export const getBookingById = factory.getOne(Booking);

/**
 * Sends a transactional email notification when a booking is confirmed
 */
export const confirmBookingAndNotify = async (booking, user) => {
  const bookingURL = `${process.env.CLIENT_URL || "https://nexride.com"}/my-bookings/${booking._id}`;

  // Non-blocking email delivery
  new Email(user, bookingURL)
    .sendBookingConfirmation({
      vehicleName: booking.vehicleId
        ? `${booking.vehicleId.make} ${booking.vehicleId.model}`
        : "Vehicle Rental",
      startDate: new Date(booking.startDate).toLocaleDateString(),
      endDate: new Date(booking.endDate).toLocaleDateString(),
      totalPrice: booking.totalAmount,
    })
    .catch((err) => {
      console.error("Failed to send booking confirmation email:", err.message);
    });
};

/**
 * Validates date ranges to prevent overlapping reservations
 */
export const checkAvailability = async (vehicleId, startDate, endDate) => {
  if (!vehicleId || !startDate || !endDate) {
    throw new AppError("Please provide vehicleId, startDate, and endDate", 400);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    throw new AppError("End date must be after start date", 400);
  }

  // A vehicle under maintenance or otherwise off the market cannot be rented,
  // regardless of what its booking ledger says.
  const vehicle = await Vehicle.findById(vehicleId).select(
    "listingStatus operationalStatus",
  );
  if (!vehicle || vehicle.listingStatus !== "PUBLISHED") {
    return { isAvailable: false };
  }
  if (vehicle.operationalStatus !== "AVAILABLE") {
    return { isAvailable: false };
  }

  // Overlap condition: (ExistingStart < RequestedEnd) AND (ExistingEnd > RequestedStart)
  const overlappingBooking = await Booking.findOne({
    vehicleId,
    bookingStatus: { $in: DATE_BLOCKING_BOOKING_STATUSES },
    startDate: { $lt: end },
    endDate: { $gt: start },
  });

  return { isAvailable: !overlappingBooking };
};

/**
 * This is the authoritative on-write mutex for a vehicle row. A conditional
 * findOneAndUpdate is an atomic "test-and-set": concurrent checkouts for the
 * same vehicle serialize on this document, so the read-then-insert collision
 * check that follows can never race past itself. The claim is always rolled
 * back to AVAILABLE inside the caller's transaction.
 */
const claimVehicleForCheckout = (vehicleId, session) =>
  Vehicle.findOneAndUpdate(
    {
      _id: vehicleId,
      listingStatus: "PUBLISHED",
      operationalStatus: "AVAILABLE",
    },
    { $set: { operationalStatus: "UNAVAILABLE" } },
    { session, new: true },
  );

const isWriteConflict = (error) =>
  error?.code === 112 ||
  /WriteConflict|TransientTransactionError/i.test(error?.message ?? "");

/**
 * Rolls the vehicle availability claim back. Conditionally matches only a unit
 * still in the transient UNAVAILABLE state, so it can never override an
 * operationalStatus that changed underneath the checkout (e.g. an admin moving
 * the unit to MAINTENANCE).
 */
const releaseVehicleFromCheckout = (vehicleId, session) =>
  Vehicle.findOneAndUpdate(
    { _id: vehicleId, operationalStatus: "UNAVAILABLE" },
    { $set: { operationalStatus: "AVAILABLE" } },
    { session },
  );

/**
 * Creates a customer booking with server-side price calculation & overlap
 * safety.
 *
 * The overlap check and the booking insert run inside one transaction, and the
 * vehicle row is claimed atomically first (see claimVehicleForCheckout), so two
 * concurrent requests for overlapping windows on the same vehicle cannot both
 * pass the check. This mirrors the protection on the HTTP checkout handler.
 */
export const createCustomerBooking = async (userId, bookingData, user) => {
  const {
    vehicleId,
    companyId,
    startDate,
    endDate,
    pickupLocation,
    pickupMethod,
    discountAmount,
  } = bookingData;

  if (!vehicleId) {
    throw new AppError("Please provide vehicleId", 400);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw new AppError("End date must be after start date", 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vehicle = await Vehicle.findById(vehicleId).session(session);
    if (!vehicle) throw new AppError("Vehicle not found", 404);
    if (
      vehicle.listingStatus !== "PUBLISHED" ||
      vehicle.operationalStatus !== "AVAILABLE"
    ) {
      throw new AppError("Vehicle is not available for rental", 409);
    }

    const claimed = await claimVehicleForCheckout(vehicleId, session);
    if (!claimed) {
      throw new AppError(
        "Vehicle is currently being booked by another customer.",
        409,
      );
    }

    const overlappingBooking = await Booking.findOne({
      vehicleId,
      bookingStatus: { $in: DATE_BLOCKING_BOOKING_STATUSES },
      $or: buildDateOverlapFilter(start, end),
    }).session(session);

    if (overlappingBooking) {
      throw new AppError("Vehicle is already booked for the selected dates", 409);
    }

    const effectiveCompanyId = companyId || claimed.companyId;
    if (!effectiveCompanyId) {
      throw new AppError("Vehicle is not linked to any rental company", 400);
    }

    // Booking model pre-validate hook handles all financial calculations
    const [newBooking] = await Booking.create(
      [
        {
          customerId: userId,
          vehicleId,
          companyId: effectiveCompanyId,
          startDate,
          endDate,
          pickupLocation: pickupLocation || claimed.pickupLocation,
          pickupMethod: pickupMethod || "BRANCH_PICKUP",
          discountAmount: discountAmount || 0,
          // dailyRate, totalDays, rentalPrice, totalAmount, commissionAmount,
          // companyShare are all auto-calculated by the booking model's
          // pre-validate hook
          dailyRate: claimed.dailyPrice,
          totalDays: 1,
          rentalPrice: claimed.dailyPrice,
          totalAmount: claimed.dailyPrice,
          commissionAmount: 0,
          companyShare: claimed.dailyPrice,
        },
      ],
      { session },
    );

    await releaseVehicleFromCheckout(vehicleId, session);

    await session.commitTransaction();
    session.endSession();

    // Trigger confirmation email if user context is passed
    if (user) {
      await confirmBookingAndNotify(newBooking, user);
    }

    return newBooking;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (isWriteConflict(error)) {
      throw new AppError(
        "Vehicle is already being booked during these dates. Please retry.",
        409,
      );
    }
    throw error;
  }
};

/**
 * Customer Self-Service Bookings
 */
export const fetchCustomerBookings = async (userId) => {
  return await Booking.find({ customerId: userId });
};

/**
 * Company Tenant Fleet Bookings
 */
export const fetchCompanyFleetBookings = async (companyId, query) => {
  // Scopes queries to company fleet tenant
  const filter = companyId ? { companyId } : {};
  return await Booking.find(filter);
};

/**
 * Cancellation refund policy (P1-2a).
 *
 * The refundable share depends on how close to pickup the cancel happens:
 *   - >= 48h before pickup: 100% refundable
 *   - 24-48h before pickup: 50% refundable
 *   - < 24h before pickup: nothing refundable
 * These are deliberately exported as data so the policy is testable and can be
 * tuned in one place.
 */
export const REFUND_POLICY = Object.freeze({
  fullRefundHours: 48,
  partialRefundHours: 24,
  partialRefundFraction: 0.5,
});

/**
 * Refundable fraction of a paid booking at cancel time.
 * @param {Date|string} startDate - scheduled pickup date
 * @param {Date|string} [cancelledAt] - cancellation moment (defaults to now)
 * @returns {number} 0, 0.5 or 1
 */
export const computeRefundFraction = (startDate, cancelledAt = new Date()) => {
  const hoursBefore = (new Date(startDate) - new Date(cancelledAt)) / 3600000;
  if (hoursBefore >= REFUND_POLICY.fullRefundHours) return 1;
  if (hoursBefore >= REFUND_POLICY.partialRefundHours) {
    return REFUND_POLICY.partialRefundFraction;
  }
  return 0;
};

const roundMoney = (value) => Number(Number(value).toFixed(2));

/**
 * Non-blocking cancellation notice. Fire-and-forget by design: an email
 * provider hiccup must never roll back a cancellation that already committed.
 */
export const notifyBookingCancellation = (booking, reason = "booking cancelled") => {
  const customer = booking.customerId;
  if (!customer?.email) return;

  const bookingURL = `${process.env.CLIENT_URL || "https://nexride.com"}/my-bookings/${booking._id}`;
  new Email(customer, bookingURL)
    .sendBookingCancellation({
      vehicleName: booking.vehicleId
        ? `${booking.vehicleId.make} ${booking.vehicleId.model}`
        : "Vehicle Rental",
      startDate: new Date(booking.startDate).toLocaleDateString(),
      endDate: new Date(booking.endDate).toLocaleDateString(),
      reason,
    })
    .catch((err) => {
      console.error("Failed to send booking cancellation email:", err.message);
    });
};

/**
 * Cancel Booking (Applies cancellation policy)
 *
 * P1-2a: cancellation now computes the eligible refund against the refund
 * policy, marks the paid ledger row REFUNDED / PARTIALLY_REFUNDED (or leaves it
 * COMPLETED when no refund is due), and stops that revenue from ever being paid
 * out - the payout rail only ever moves COMPLETED rows, and the cancellation
 * badge drops the row out of future dispatch/settlement runs.
 *
 * P1-2b: the vehicle is returned to the market only when it is not also
 * quarantined for maintenance, so cancelling a booking can no longer undo an
 * operator's maintenance lock.
 */
export const cancelBookingById = async (bookingId, user, { reason = null } = {}) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError("Booking not found", 404);

  if (
    booking.bookingStatus === "CANCELLED" ||
    booking.bookingStatus === "COMPLETED" ||
    booking.bookingStatus === "ACTIVE"
  ) {
    throw new AppError(
      `Cannot cancel a booking that is already ${booking.bookingStatus}`,
      400,
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    booking.bookingStatus = "CANCELLED";
    booking.cancelledBy = user.id;
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason ?? booking.cancellationReason;

    const refundFraction = computeRefundFraction(
      booking.startDate,
      booking.cancelledAt,
    );

    // The latest completed ledger row is the one that was actually collected
    // and could still be paid out.
    const paidPayment = await Payment.findOne({
      bookingId: booking._id,
      status: "COMPLETED",
    })
      .sort({ createdAt: -1 })
      .session(session);

    if (paidPayment) {
      const refundAmount = roundMoney(
        Math.min(paidPayment.amount * refundFraction, paidPayment.amount),
      );

      if (refundAmount > 0) {
        const newStatus =
          refundAmount >= paidPayment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";

        await Payment.findOneAndUpdate(
          { _id: paidPayment._id, status: "COMPLETED" },
          {
            $set: {
              status: newStatus,
              refundAmount,
              refundedAt: booking.cancelledAt,
              refundedBy: user.id,
              refundReason: reason ?? "Booking cancelled by customer",
            },
          },
          { session, new: true, runValidators: true },
        );

        booking.paymentStatus =
          newStatus === "PARTIALLY_REFUNDED"
            ? "PARTIALLY_REFUNDED"
            : "REFUNDED";
      }
      // refundAmount === 0: policy allows no refund, the company legally keeps
      // the whole amount, so the payment stays COMPLETED and remains payable.
    } else {
      // Never paid. Retire any dangling PENDING cash ledger row so nothing
      // collectable lingers for a booking that will never happen.
      await Payment.updateMany(
        { bookingId: booking._id, status: "PENDING" },
        {
          $set: {
            status: "FAILED",
            refundReason: "Booking cancelled before payment",
          },
        },
        { session },
      );
      booking.paymentStatus = "UNPAID";
    }

    await booking.save({ session, validateBeforeSave: false });

    // Never undo a maintenance lock. Only a vehicle with no open maintenance
    // event returns to the market when its booking is cancelled.
    const openMaintenance = await MaintenanceEvent.exists({
      vehicleId: booking.vehicleId,
      status: { $ne: "COMPLETED" },
    }).session(session);
    if (!openMaintenance) {
      await Vehicle.findByIdAndUpdate(
        booking.vehicleId,
        { operationalStatus: "AVAILABLE" },
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }

  notifyBookingCancellation(booking, reason ?? "booking cancelled");

  return booking;
};

/**
 * Company Fleet Status Lifecycle Transition (CONFIRMED -> ACTIVE -> COMPLETED)
 */
export const updateLifecycleStatus = async (bookingId, status) => {
  const validStatuses = [
    "PENDING_PAYMENT",
    "PAID",
    "CONFIRMED",
    "ACTIVE",
    "COMPLETED",
    "CANCELLED",
    "EXPIRED",
  ];
  if (!status || !validStatuses.includes(status.toUpperCase())) {
    throw new AppError(
      `Invalid booking status. Must be one of: ${validStatuses.join(", ")}`,
      400,
    );
  }

  const booking = await Booking.findByIdAndUpdate(
    bookingId,
    { bookingStatus: status.toUpperCase() },
    { new: true, runValidators: true },
  );

  if (!booking) throw new AppError("Booking not found", 404);
  return booking;
};
