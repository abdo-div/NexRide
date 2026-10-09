import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Vehicle from "../models/vehicle_model.js";
import Payment from "../models/payment_model.js";
import * as bookingService from "../services/bookingService.js";
import { streamInvoiceForPayment } from "../services/invoiceService.js";
import catchAsync from "../utils/catchAsync.js";
import * as factory from "./handlerFactory.js";
import AppError from "../utils/appError.js";
import { isRedisAvailable } from "../config/redis.js";
import { acquireVehicleLock } from "../utils/redisLock.js";
import {
  holdVehicleForCheckout,
  releaseVehicleHold,
} from "../services/reservationHold.service.js";
import {
  DATE_BLOCKING_BOOKING_STATUSES,
  buildDateOverlapFilter,
} from "../utils/bookingStatus.js";
import { getPlatformPolicy } from "../services/platformPolicyService.js";
// Administrative register.
//
// The search allowlist lives in the service (`BOOKING_SEARCH_FIELDS`) because the
// hub scope is resolved there as well; both have to be applied before the page is
// sliced and counted.
export const getAllBookings = catchAsync(async (req, res) => {
  const { docs, pagination } = await bookingService.listBookings(req.query);

  res.status(200).json({
    status: "success",
    results: docs.length,
    pagination,
    data: { data: docs },
  });
});

// GET /:id must answer with `{ data: { booking } }` — the same envelope used by
// POST / (create) and GET /my-bookings — so the frontend bookingApi.get contract
// (`result.data.booking`) holds on every endpoint.
export const getBookingById = catchAsync(async (req, res, next) => {
  const booking = await bookingService.getBookingById(req.params.id);
  res.status(200).json({
    status: "success",
    data: { booking },
  });
});

// Streams the official invoice PDF for the newly paid booking. Resolves the
// latest payment ledger record for the booking, then hands off to the shared
// invoice streamer so the layout is identical to the payments/:id/invoice
// endpoint it mirrors.
export const downloadBookingInvoice = catchAsync(async (req, res, next) => {
  const payment = await Payment.findOne({ bookingId: req.params.id }).sort({
    createdAt: -1,
  });

  if (!payment) {
    return next(
      new AppError("No payment record found for this booking", 404),
    );
  }

  await streamInvoiceForPayment(res, payment);
});

// Redis is only a concurrency convenience around the authoritative DB check;
// a hiccup after the booking committed must never turn a successful booking
// into an error response.
const safelyRelease = async (fn) => {
  try {
    await fn();
  } catch (err) {
    /* best-effort cleanup only */
  }
};

/**
 * Pre-booking concurrency check
 */
export const checkVehicleAvailability = catchAsync(async (req, res, next) => {
  const { vehicleId, startDate, endDate } = req.query;
  const result = await bookingService.checkAvailability(
    vehicleId,
    startDate,
    endDate,
  );

  res.status(200).json({
    status: "success",
    data: result,
  });
});

export const buildBookingCollisionQuery = (vehicleId, startDate, endDate) => ({
  vehicleId,
  bookingStatus: { $in: DATE_BLOCKING_BOOKING_STATUSES },
  $or: buildDateOverlapFilter(startDate, endDate),
});

export const bookingConcurrency = {
  isRedisAvailable,
  holdVehicleForCheckout,
  acquireVehicleLock,
  releaseVehicleHold,
};

/**
 * Customer booking creation
 */
export const createBooking = catchAsync(async (req, res, next) => {
  const {
    vehicleId,
    startDate,
    endDate,
    pickupLocation,
    paymentMethod,
  } = req.body;
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Booking writes require both Redis concurrency controls; never start the
  // database transaction unless Redis protection has been acquired.
  let redisReady = false;
  try {
    redisReady = await bookingConcurrency.isRedisAvailable();
  } catch {
    redisReady = false;
  }
  if (!redisReady) {
    return next(
      new AppError(
        "Booking is temporarily unavailable. Please try again shortly.",
        503,
      ),
    );
  }

  let hold;
  try {
    hold = await bookingConcurrency.holdVehicleForCheckout(
      vehicleId,
      req.user.id,
    );
  } catch {
    return next(
      new AppError(
        "Booking is temporarily unavailable. Please try again shortly.",
        503,
      ),
    );
  }
  if (!hold.success) {
    return next(new AppError(hold.message, 409));
  }

  // 1. Acquire Redis Distributed Lock for the specific vehicle
  let lock;
  if (redisReady) {
    try {
      lock = await bookingConcurrency.acquireVehicleLock(vehicleId, 10000);
    } catch (err) {
      await safelyRelease(() =>
        bookingConcurrency.releaseVehicleHold(vehicleId),
      );
      let redisStillReady = false;
      try {
        redisStillReady = await bookingConcurrency.isRedisAvailable();
      } catch {
        redisStillReady = false;
      }
      if (!redisStillReady) {
        return next(
          new AppError(
            "Booking is temporarily unavailable. Please try again shortly.",
            503,
          ),
        );
      }
      return next(
        new AppError(
          "Vehicle is currently processing another checkout attempt. Please retry in a few seconds.",
          429,
        ),
      );
    }
  }

  if (!lock || typeof lock.release !== "function") {
    await safelyRelease(() =>
      bookingConcurrency.releaseVehicleHold(vehicleId),
    );
    return next(
      new AppError(
        "Booking is temporarily unavailable. Please try again shortly.",
        503,
      ),
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Distinguish a missing/unpublished listing (404) from a vehicle that is
    // simply not rentable right now (409), so a vehicle in MAINTENANCE
    // surfaces a clear conflict instead of a misleading "not found".
    const vehicle = await Vehicle.findById(vehicleId).session(session);
    if (!vehicle || vehicle.listingStatus !== "PUBLISHED") {
      throw new AppError("Vehicle is not available for rental.", 404);
    }
    if (vehicle.operationalStatus !== "AVAILABLE") {
      throw new AppError(
        "Vehicle is currently unavailable for rental (maintenance or already out of service).",
        409,
      );
    }

    // 2. Atomic row-level transaction mutex (P1-1 race fix).
    //
    // The overlap check below is read-then-insert: two concurrent transactions
    // can both observe "no overlap" and both insert. Latching onto the vehicle
    // row with a conditional findOneAndUpdate makes the vehicle document the
    // mutex. Touching updatedAt creates write contention without using the
    // physical operationalStatus as a temporary reservation flag.
    const claimed = await Vehicle.findOneAndUpdate(
      {
        _id: vehicleId,
        listingStatus: "PUBLISHED",
        operationalStatus: "AVAILABLE",
      },
      { $set: { updatedAt: new Date() } },
      { session, new: true },
    );

    if (!claimed) {
      throw new AppError(
        "Vehicle is currently being booked by another customer.",
        409,
      );
    }

    // 3. Double-booking collision check within the database transaction
    // session. Serialized on the vehicle row above, so a losing concurrent
    // writer can no longer slip past this check.
    const existingCollision = await Booking.findOne(
      buildBookingCollisionQuery(vehicleId, start, end),
    ).session(session);

    if (existingCollision) {
      throw new AppError("Vehicle is already booked during these dates.", 409);
    }

    const rentalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalAmount = rentalDays * claimed.dailyPrice;
    // The Booking pre-validation hook applies the company's override. These
    // values satisfy required fields until that authoritative snapshot runs.
    const platformPolicy = await getPlatformPolicy();
    const commissionRate = platformPolicy.commissionRatePct;
    const commissionAmount = totalAmount * (commissionRate / 100);
    const companyShare = totalAmount - commissionAmount;

    const [booking] = await Booking.create(
      [
        {
          customerId: req.user.id,
          companyId: vehicle.companyId,
          vehicleId,
          startDate: start,
          endDate: end,
          pickupLocation: pickupLocation || vehicle.pickupLocation,
          dailyRate: vehicle.dailyPrice,
          totalDays: rentalDays,
          rentalPrice: totalAmount,
          totalAmount,
          commissionRate,
          commissionAmount,
          companyShare,
          bookingStatus: "PENDING_PAYMENT",
          paymentStatus: "UNPAID",
        },
      ],
      { session },
    );

    let payment;
    if (paymentMethod === "CASH_ON_DELIVERY") {
      [payment] = await Payment.create(
        [
          {
            bookingId: booking._id,
            customerId: req.user.id,
            companyId: vehicle.companyId,
            amount: booking.totalAmount,
            paymentMethod,
            status: "PENDING",
            payoutStatus: "UNSETTLED",
          },
        ],
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Release lock AND the checkout hold upon successful creation. The hold is
    // only a checkout-session reservation, not a booking: leaving it in place
    // for its full 10-minute TTL would prevent any other user (or the same
    // user's next booking) from checking out the same vehicle immediately.
    if (lock) await safelyRelease(() => lock.release());
    await safelyRelease(() =>
      bookingConcurrency.releaseVehicleHold(vehicleId),
    );

    const data = { booking };
    if (payment) data.payment = payment;

    res.status(201).json({
      status: "success",
      data,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Always release lock and checkout hold on failure
    if (lock) await safelyRelease(() => lock.release());
    await safelyRelease(() =>
      bookingConcurrency.releaseVehicleHold(vehicleId),
    );

    // Two transactions that contended for the same vehicle row abort one of
    // them with MongoDB's WriteConflict before any writes are visible. Surface
    // that as the same "already being booked" 409 the collision check would
    // have produced, never as a 500.
    if (
      error?.code === 112 ||
      /WriteConflict|TransientTransactionError/i.test(error?.message ?? "")
    ) {
      return next(
        new AppError(
          "Vehicle is already being booked during these dates. Please retry.",
          409,
        ),
      );
    }

    next(error);
  }
});

/**
 * Fetch customer self-service bookings
 */
export const getMyBookings = catchAsync(async (req, res, next) => {
  const bookings = await bookingService.fetchCustomerBookings(req.user.id);

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: { bookings },
  });
});

/**
 * Fetch tenant company bookings
 */
export const getCompanyBookings = catchAsync(async (req, res, next) => {
  // Company sessions are bound to their own tenant: `req.tenantId` comes from
  // protect() (req.user.company). A caller-supplied ?companyId= is never
  // honoured for company accounts - that would let one operator read another
  // operator's booking ledger. Admins may still scope to any tenant via the
  // query param (or see the full platform ledger when it is omitted).
  const isAdmin = req.user?.role === "admin";
  let companyId = isAdmin ? req.query.companyId || null : req.tenantId || null;

  if (!companyId && !isAdmin && req.user?.id) {
    const ownedCompany = await mongoose
      .model("Company")
      .findOne({ ownerId: req.user.id });
    if (ownedCompany) companyId = ownedCompany._id;
  }

  if (!companyId) {
    return next(
      new AppError("No company tenant is linked to this user account.", 403),
    );
  }

  const bookings = await bookingService.fetchCompanyFleetBookings(
    companyId,
    req.query,
  );

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: { bookings },
  });
});

/**
 * Cancel booking
 */
export const cancelBooking = catchAsync(async (req, res, next) => {
  const booking = await bookingService.cancelBookingById(
    req.params.id,
    req.user,
    { reason: req.body?.reason ?? null },
  );

  res.status(200).json({
    status: "success",
    data: { booking },
  });
});

/**
 * Update booking status
 */
export const updateBookingStatus = catchAsync(async (req, res, next) => {
  const booking = await bookingService.updateLifecycleStatus(
    req.params.id,
    req.body.status,
    req.user,
  );

  res.status(200).json({
    status: "success",
    data: { booking },
  });
});
