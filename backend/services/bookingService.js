import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Vehicle from "../models/vehicle_model.js";
import Company from "../models/Company_model.js";
import Payment from "../models/payment_model.js";
import Refund from "../models/Refund_model.js";
import MaintenanceEvent from "../models/Maintenance_model.js";
import AppError from "../utils/appError.js";
import * as factory from "./serviceFactory.js";
import { runPaginatedQuery } from "../utils/paginatedQuery.js";
import Email from "../utils/email.js";
import {
  DATE_BLOCKING_BOOKING_STATUSES,
  buildDateOverlapFilter,
} from "../utils/bookingStatus.js";
import { getPlatformPolicy } from "./platformPolicyService.js";
import { resolveClientUrl } from "../config/clientUrl.js";
import { releaseVehicleHold } from "./reservationHold.service.js";
import { notifyBookingEvent } from "./notificationService.js";
import { calculatePromotionDiscount } from "./rewardService.js";
import { calculateBookingExtras, MUNICIPAL_FEE_LYD } from "../utils/bookingPricing.js";

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

export const saveCustomerHandover = async (bookingId, customerId, payload) => {
  const booking = await Booking.findOne({ _id: bookingId, customerId });
  if (!booking) throw new AppError("Booking not found", 404);

  const stage = payload.stage;
  booking.handover ??= {};
  if (stage === "PICKUP") {
    if (!["CONFIRMED", "ACTIVE"].includes(booking.bookingStatus)) {
      throw new AppError("Pickup acknowledgement is not available for this booking", 409);
    }
    booking.handover.pickup = {
      ...booking.handover.pickup?.toObject?.(),
      licenceReady: true,
      identityReady: true,
      vehicleInspected: true,
      fuelRecorded: true,
      notes: payload.notes ?? "",
      customerConfirmedAt: new Date(),
    };
  } else {
    if (booking.bookingStatus !== "ACTIVE") {
      throw new AppError("Return declaration is available only during an active rental", 409);
    }
    booking.handover.return = {
      ...booking.handover.return?.toObject?.(),
      personalItemsRemoved: true,
      fuelRestored: payload.fuelRestored,
      damageReported: payload.damageReported,
      fuelLevel: payload.fuelLevel,
      odometer: payload.odometer ?? null,
      notes: payload.notes ?? "",
      customerSubmittedAt: new Date(),
    };
  }

  await booking.save({ validateBeforeSave: false });
  return booking;
};

/**
 * Sends a transactional email notification when a booking is confirmed
 */
export const confirmBookingAndNotify = async (booking, user) => {
  const bookingURL = `${resolveClientUrl()}/my-bookings/${booking._id}`;

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
 * Changes an unpaid reservation while preserving the same booking/payment
 * identities. Paid reservations deliberately remain immutable here: Moamalat
 * does not currently expose a trusted adjustment/refund API, so changing a
 * paid total would make the booking ledger disagree with money actually moved.
 */
export const modifyUnpaidCustomerBooking = async (
  bookingId,
  customerId,
  changes,
) => {
  const session = await mongoose.startSession();
  let updatedBooking;

  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) throw new AppError("Booking not found", 404);

      const ownerId = booking.customerId?._id ?? booking.customerId;
      if (!ownerId || ownerId.toString() !== customerId.toString()) {
        throw new AppError("You can only modify your own booking.", 403);
      }

      if (
        booking.bookingStatus !== "PENDING_PAYMENT" ||
        booking.paymentStatus !== "UNPAID"
      ) {
        throw new AppError(
          "Paid or confirmed bookings cannot be changed online. Contact support to arrange a safe payment adjustment.",
          409,
        );
      }

      const start = new Date(changes.startDate);
      const end = new Date(changes.endDate);
      const vehicleId = booking.vehicleId?._id ?? booking.vehicleId;

      const claimedVehicle = await Vehicle.findOneAndUpdate(
        {
          _id: vehicleId,
          listingStatus: "PUBLISHED",
          operationalStatus: "AVAILABLE",
        },
        { $set: { updatedAt: new Date() } },
        { session, new: true },
      );
      if (!claimedVehicle) {
        throw new AppError("Vehicle is no longer available for rental.", 409);
      }

      const collision = await Booking.findOne({
        _id: { $ne: booking._id },
        vehicleId,
        bookingStatus: { $in: DATE_BLOCKING_BOOKING_STATUSES },
        $or: buildDateOverlapFilter(start, end),
      }).session(session);
      if (collision) {
        throw new AppError("Vehicle is already booked during these dates.", 409);
      }

      booking.startDate = start;
      booking.endDate = end;
      booking.pickupLocation = changes.pickupLocation;
      booking.pickupMethod = changes.pickupMethod;
      booking.addonIds = changes.addonIds ?? [];
      if (booking.promotionCode) {
        const rentalDays = Math.ceil((end - start) / 86400000);
        const extras = calculateBookingExtras(booking.addonIds, rentalDays);
        const subtotal = rentalDays * claimedVehicle.dailyPrice + extras.addonsTotal + MUNICIPAL_FEE_LYD;
        const promotion = await calculatePromotionDiscount({ code: booking.promotionCode, customerId, subtotal, session });
        booking.discountAmount = promotion.discountAmount;
      }
      booking.paymentSessionExpiresAt = null;
      await booking.save({ session });

      // Keep an existing cash/Moamalat intent aligned with the authoritative
      // server-recalculated booking total. Payment's save hook recomputes its
      // commission split; no client-supplied price is ever accepted.
      const pendingPayment = await Payment.findOne({
        bookingId: booking._id,
        status: "PENDING",
      }).session(session);
      if (pendingPayment) {
        pendingPayment.amount = booking.totalAmount;
        pendingPayment.merchantReference = undefined;
        await pendingPayment.save({ session });
      }

      updatedBooking = booking;
    });
  } finally {
    await session.endSession();
  }

  void notifyBookingEvent(updatedBooking, "BOOKING_CHANGED").catch(() => {});
  return updatedBooking;
};

/**
 * Touching the row inside the transaction provides a write-conflict mutex
 * without overloading operationalStatus with a temporary reservation state.
 */
const claimVehicleForCheckout = (vehicleId, session) =>
  Vehicle.findOneAndUpdate(
    {
      _id: vehicleId,
      listingStatus: "PUBLISHED",
      operationalStatus: "AVAILABLE",
    },
    { $set: { updatedAt: new Date() } },
    { session, new: true },
  );

const isWriteConflict = (error) =>
  error?.code === 112 ||
  /WriteConflict|TransientTransactionError/i.test(error?.message ?? "");

/**
 * No release write is required: the transaction mutex never changes physical
 * vehicle state.
 */
const releaseVehicleFromCheckout = async () => undefined;

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
    promotionCode,
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

    const rentalDays = Math.ceil((end - start) / 86400000);
    const subtotal = rentalDays * claimed.dailyPrice;
    const promotion = await calculatePromotionDiscount({ code: promotionCode, customerId: userId, subtotal, session });
    // Booking model pre-validate hook handles the complete financial calculation.
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
          discountAmount: promotion.discountAmount,
          promotionCode: promotion.code,
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
  return await Booking.find({ customerId: userId }).sort({ createdAt: -1 });
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
export const computeRefundFraction = (
  startDate,
  cancelledAt = new Date(),
  policy = REFUND_POLICY,
) => {
  const hoursBefore = (new Date(startDate) - new Date(cancelledAt)) / 3600000;
  if (hoursBefore >= policy.fullRefundHours) return 1;
  if (hoursBefore >= policy.partialRefundHours) {
    return policy.partialRefundFraction;
  }
  return 0;
};

const roundMoney = (value) => Number(Number(value).toFixed(2));

const cancellationPolicy = async () => {
  const { freeCancellationHours } = await getPlatformPolicy();
  return {
    fullRefundHours: freeCancellationHours,
    partialRefundHours: freeCancellationHours / 2,
    partialRefundFraction: REFUND_POLICY.partialRefundFraction,
  };
};

export const getCancellationQuote = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError("Booking not found", 404);

  const existingRefund = await Refund.findOne({ bookingId: booking._id }).sort({
    createdAt: -1,
  });
  const payment = await Payment.findOne({
    bookingId: booking._id,
    status: { $in: ["COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED"] },
  }).sort({ createdAt: -1 });
  const policy = await cancellationPolicy();
  const paidAmount = Number(payment?.amount ?? 0);
  const fraction = existingRefund
    ? Number(existingRefund.refundFraction)
    : computeRefundFraction(booking.startDate, new Date(), policy);
  const refundableAmount = existingRefund
    ? Number(existingRefund.amount)
    : roundMoney(Math.min(paidAmount * fraction, paidAmount));

  return {
    bookingId: String(booking._id),
    canCancel: !["CANCELLED", "COMPLETED", "ACTIVE"].includes(booking.bookingStatus),
    bookingStatus: booking.bookingStatus,
    currency: payment?.currency ?? "LYD",
    paidAmount,
    refundableAmount,
    cancellationFee: roundMoney(Math.max(paidAmount - refundableAmount, 0)),
    refundFraction: fraction,
    refundRequired: refundableAmount > 0,
    policy: {
      fullRefundHours: policy.fullRefundHours,
      partialRefundHours: policy.partialRefundHours,
    },
    refund: existingRefund
      ? {
          id: String(existingRefund._id),
          status: existingRefund.status,
          requestedAt: existingRefund.requestedAt,
          processingAt: existingRefund.processingAt,
          completedAt: existingRefund.completedAt,
          failedAt: existingRefund.failedAt,
          failureReason: existingRefund.failureReason,
        }
      : null,
  };
};

/**
 * Non-blocking cancellation notice. Fire-and-forget by design: an email
 * provider hiccup must never roll back a cancellation that already committed.
 */
export const notifyBookingCancellation = (booking, reason = "booking cancelled") => {
  const customer = booking.customerId;
  if (!customer?.email) return;

  const bookingURL = `${resolveClientUrl()}/my-bookings/${booking._id}`;
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

    const policy = await cancellationPolicy();
    const refundFraction = computeRefundFraction(
      booking.startDate,
      booking.cancelledAt,
      policy,
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

        await Refund.create(
          [{
            bookingId: booking._id,
            paymentId: paidPayment._id,
            customerId: booking.customerId?._id ?? booking.customerId,
            companyId: booking.companyId?._id ?? booking.companyId ?? paidPayment.companyId,
            amount: refundAmount,
            feeAmount: roundMoney(paidPayment.amount - refundAmount),
            paidAmount: paidPayment.amount,
            currency: paidPayment.currency ?? "LYD",
            refundFraction,
            status: "PENDING",
            reason: reason ?? "Booking cancelled by customer",
            requestedAt: booking.cancelledAt,
          }],
          { session },
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

  try {
    await releaseVehicleHold(booking.vehicleId);
  } catch {
    // Redis holds live outside Mongo; release is best-effort.
  }

  notifyBookingCancellation(booking, reason ?? "booking cancelled");
  void notifyBookingEvent(booking, "BOOKING_CANCELLED").catch(() => {});

  return booking;
};

/**
 * Releases a reservation whose online payment did not succeed.
 *
 * A `PENDING_PAYMENT`/`UNPAID` booking occupies the vehicle's dates (see
 * DATE_BLOCKING_BOOKING_STATUSES), so an unsuccessful Moamalat attempt must not
 * leave the car rented to that customer: the booking is retired to `EXPIRED`
 * and the unit is returned to the market in the same transaction. Nothing was
 * collected, so there is no refund to compute; any dangling `PENDING` ledger
 * row is retired to `FAILED` so it cannot dangle forever.
 *
 * Idempotent and safe to call after a late success: once the booking is no
 * longer `PENDING_PAYMENT`/`UNPAID` (e.g. the customer paid, or the reaper
 * already expired it) nothing is changed. A maintenance lock always wins over
 * returning the unit to the market, mirroring the cancellation guard.
 */
export const releaseUnpaidBooking = async (
  bookingId,
  { reason = "Payment was not completed" } = {},
) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError("Booking not found", 404);

  if (
    booking.bookingStatus !== "PENDING_PAYMENT" ||
    booking.paymentStatus !== "UNPAID"
  ) {
    return {
      released: false,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
    };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  let released = false;
  try {
    // Re-read under the transaction so a payment that lands between the read
    // above and now is never clobbered with a release write.
    const current = await Booking.findById(bookingId).session(session);
    if (
      !current ||
      current.bookingStatus !== "PENDING_PAYMENT" ||
      current.paymentStatus !== "UNPAID"
    ) {
      await session.abortTransaction();
      return {
        released: false,
        bookingStatus: current?.bookingStatus ?? null,
        paymentStatus: current?.paymentStatus ?? null,
      };
    }

    current.bookingStatus = "EXPIRED";
    current.cancellationReason = current.cancellationReason ?? reason;
    await current.save({ session, validateBeforeSave: false });

    await Payment.updateMany(
      { bookingId: current._id, status: "PENDING" },
      { $set: { status: "FAILED", refundReason: reason } },
      { session },
    );

    // Never release a unit an operator quarantined for maintenance.
    const openMaintenance = await MaintenanceEvent.exists({
      vehicleId: current.vehicleId,
      status: { $ne: "COMPLETED" },
    }).session(session);

    if (!openMaintenance) {
      await Vehicle.findByIdAndUpdate(
        current.vehicleId,
        { $set: { operationalStatus: "AVAILABLE" } },
        { session },
      );
    }

    await session.commitTransaction();
    released = true;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

  if (released) {
    // The Redis checkout hold lives outside Mongo; clearing it is best-effort.
    try {
      await releaseVehicleHold(booking.vehicleId);
    } catch {
      /* a leftover key self-expires after its TTL */
    }
    void notifyBookingEvent(booking, "PAYMENT_FAILED").catch(() => {});
  }

  return {
    released,
    bookingStatus: released ? "EXPIRED" : booking.bookingStatus,
    paymentStatus: "UNPAID",
  };
};

/**
 * Company Fleet Status Lifecycle transition map.
 *
 * The value of each entry is the set of allowed target statuses for a booking
 * currently in that key state. COMPLETED, CANCELLED and EXPIRED are terminal:
 * once a booking reaches one of them it can never move again. EXPIRED is never
 * a valid *target* through the operator pipeline at all - it is produced only
 * by the background expiry reaper (bookingExpiry.service.js).
 */
export const BOOKING_STATUS_TRANSITIONS = Object.freeze({
  PENDING_PAYMENT: ["PAID", "CONFIRMED", "CANCELLED"],
  PAID: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
});

/**
 * Transitions that require real money before the booking may leave its current
 * state. Both rails flip `booking.paymentStatus = "PAID"` before this method is
 * ever relevant: Moamalat online capture (moamalat.service.js) and the
 * cash-on-delivery collection path (markCashPaymentCompleted). There is no
 * separate "COLLECTED" booking state - cash collection writes the same field -
 * so a single `paymentStatus === "PAID"` guard is the unified precondition.
 */
const PAYMENT_REQUIRED_TARGETS = new Set(["PAID", "CONFIRMED", "ACTIVE", "COMPLETED"]);

/**
 * Company Fleet Status Lifecycle Transition with a strict state machine.
 *
 * Enforced rules:
 *   - PENDING_PAYMENT -> PAID / CONFIRMED only once the payment is confirmed
 *     (`paymentStatus === "PAID"`).
 *   - CONFIRMED -> ACTIVE (pickup) then ACTIVE -> COMPLETED (return).
 *   - CANCELLED is reachable from any open (non-terminal) state.
 *   - COMPLETED requires `paymentStatus === "PAID"` (online or cash).
 *   - Direct PENDING_PAYMENT -> COMPLETED / ACTIVE is rejected.
 *   - Terminal states (COMPLETED/CANCELLED/EXPIRED) never transition again.
 *
 * Reaching COMPLETED or CANCELLED releases the vehicle back to "AVAILABLE"
 * inside the same transaction as the status write, so the two states can never
 * go out of sync. A maintenance lock is never overridden (mirrors the guard in
 * cancelBookingById), so completing or cancelling can never un-quarantine a
 * unit the operator intentionally took off the market.
 */
export const updateLifecycleStatus = async (bookingId, status, actorUser = null) => {
  const target = String(status ?? "").toUpperCase();

  if (!Object.hasOwn(BOOKING_STATUS_TRANSITIONS, target)) {
    throw new AppError(
      `Invalid booking status. Must be one of: ${Object.keys(BOOKING_STATUS_TRANSITIONS).join(", ")}`,
      400,
    );
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError("Booking not found", 404);

  const from = booking.bookingStatus;

  if (target === from) {
    throw new AppError(`Booking is already ${target}`, 400);
  }

  if (!BOOKING_STATUS_TRANSITIONS[from]?.includes(target)) {
    throw new AppError(
      `Invalid booking status transition: ${from} -> ${target}`,
      400,
    );
  }

  if (PAYMENT_REQUIRED_TARGETS.has(target) && booking.paymentStatus !== "PAID") {
    throw new AppError(
      `Booking cannot transition to ${target} until its payment is confirmed (paymentStatus must be "PAID").`,
      400,
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    booking.bookingStatus = target;

    if (target === "CANCELLED") {
      booking.cancelledBy = actorUser?.id ?? actorUser?._id ?? booking.cancelledBy;
      booking.cancelledAt = booking.cancelledAt ?? new Date();
      booking.cancellationReason =
        booking.cancellationReason ?? "Booking cancelled by operator";
    }

    await booking.save({ session, validateBeforeSave: false });

    if (target === "COMPLETED" || target === "CANCELLED") {
      const openMaintenance = await MaintenanceEvent.exists({
        vehicleId: booking.vehicleId,
        status: { $ne: "COMPLETED" },
      }).session(session);

      if (!openMaintenance) {
        await Vehicle.findByIdAndUpdate(
          booking.vehicleId,
          { $set: { operationalStatus: "AVAILABLE" } },
          { session },
        );
      }
    }

    await session.commitTransaction();
    session.endSession();
    if (target === "CONFIRMED") {
      void notifyBookingEvent(booking, "BOOKING_CONFIRMED").catch(() => {});
    }
    if (target === "CANCELLED") {
      void notifyBookingEvent(booking, "BOOKING_CANCELLED").catch(() => {});
    }
    return booking;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
