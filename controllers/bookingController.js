import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Vehicle from "../models/vehicle_model.js";
import * as bookingService from "../services/bookingService.js";
import catchAsync from "../utils/catchAsync.js";
import * as factory from "./handlerFactory.js";
import AppError from "../utils/appError.js";
import { acquireVehicleLock } from "../utils/redisLock.js";
// Administrative & General Lookup
export const getAllBookings = factory.getAll(Booking);
export const getBookingById = factory.getOne(Booking);

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

/**
 * Customer booking creation
 */
export const createBooking = catchAsync(async (req, res, next) => {
  const { vehicleId, startDate, endDate, pickupLocation } = req.body;
  const start = new Date(startDate);
  const end = new Date(endDate);

  // 1. Acquire Redis Distributed Lock for the specific vehicle
  let lock;
  try {
    lock = await acquireVehicleLock(vehicleId, 10000);
  } catch (err) {
    return next(
      new AppError(
        "Vehicle is currently processing another checkout attempt. Please retry in a few seconds.",
        429,
      ),
    );
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
    const existingCollision = await Booking.findOne({
      vehicle: vehicleId,
      bookingStatus: { $in: ["PAID", "CONFIRMED", "ACTIVE"] },
      $or: [{ startDate: { $lt: end }, endDate: { $gt: start } }],
    }).session(session);

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

    await session.commitTransaction();
    session.endSession();

    // Release lock upon successful creation
    await lock.release();

    res.status(201).json({
      status: "success",
      data: { booking },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Always release lock on failure
    if (lock) await lock.release();
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
