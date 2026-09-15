import Booking from "../models/booking_model.js";
import * as bookingService from "../services/bookingService.js";
import catchAsync from "../utils/catchAsync.js";
import * as factory from "./handlerFactory.js";

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
    endDate
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
  const booking = await bookingService.createCustomerBooking(
    req.user.id,
    req.body
  );

  res.status(201).json({
    status: "success",
    data: { booking },
  });
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
  // Uses req.tenantId or req.user.company set by tenant middleware
  const companyId = req.tenantId || req.user.company;
  const bookings = await bookingService.fetchCompanyFleetBookings(
    companyId,
    req.query
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
    req.user
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
    req.body.status
  );

  res.status(200).json({
    status: "success",
    data: { booking },
  });
});