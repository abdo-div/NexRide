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
// Administrative & General Lookup
export const getAllBookings = factory.getAll(Booking);

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
  bookingStatus: { $in: ["PAID", "CONFIRMED", "ACTIVE"] },
  $or: [{ startDate: { $lt: endDate }, endDate: { $gt: startDate } }],
});

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

  // 0. Redis guard: the checkout hold and distributed lock are concurrency
  //    conveniences, NOT the source of truth. When Redis is unreachable the
  //    transaction below still runs the authoritative double-booking check, so
  //    checkout degrades gracefully instead of queueing commands forever on
  //    the offline client (enableOfflineQueue: true would otherwise hang).
  const redisReady = await isRedisAvailable();

  // 0. Reserve the vehicle for this checkout session (10-minute hold, NX key).
  //    409 if another user is already in checkout for this vehicle.
  const hold = redisReady
    ? await holdVehicleForCheckout(vehicleId, req.user.id)
    : { success: true };
  if (!hold.success) {
    return next(new AppError(hold.message, 409));
  }

  // 1. Acquire Redis Distributed Lock for the specific vehicle
  let lock;
  if (redisReady) {
    try {
      lock = await acquireVehicleLock(vehicleId, 10000);
    } catch (err) {
      await safelyRelease(() => releaseVehicleHold(vehicleId));
      return next(
        new AppError(
          "Vehicle is currently processing another checkout attempt. Please retry in a few seconds.",
          429,
        ),
      );
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      listingStatus: "PUBLISHED",
      operationalStatus: "AVAILABLE",
    }).session(session);

    if (!vehicle) {
      throw new AppError("Vehicle is not available for rental.", 404);
    }

    // 2. Double-booking collision check within database transaction session
    const existingCollision = await Booking.findOne(
      buildBookingCollisionQuery(vehicleId, start, end),
    ).session(session);

    if (existingCollision) {
      throw new AppError("Vehicle is already booked during these dates.", 409);
    }

    const rentalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalAmount = rentalDays * vehicle.dailyPrice;
    const commissionAmount = totalAmount * 0.08;
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
          commissionRate: 0.08,
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
    if (redisReady) await safelyRelease(() => releaseVehicleHold(vehicleId));

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
    if (redisReady) await safelyRelease(() => releaseVehicleHold(vehicleId));
    next(error);
  }
});

/**
 * Initialize Stripe payment
 */
export const getCheckoutSession = catchAsync(async (req, res, next) => {
  const session = await bookingService.createCheckoutSession({
    vehicleId: req.params.vehicleId,
    user: req.user,
    protocol: req.protocol,
    host: req.get("host"),
  });

  res.status(200).json({
    status: "success",
    session,
  });
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
  let companyId = req.tenantId || req.user.company;
  if (!companyId && req.user?.id) {
    const mongoose = (await import("mongoose")).default;
    const ownedCompany = await mongoose
      .model("Company")
      .findOne({ ownerId: req.user.id });
    if (ownedCompany) companyId = ownedCompany._id;
  }
  if (!companyId && req.query.companyId) {
    companyId = req.query.companyId;
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
  );

  res.status(200).json({
    status: "success",
    data: { booking },
  });
});
