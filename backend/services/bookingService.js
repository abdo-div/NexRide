import Booking from "../models/booking_model.js";
import Vehicle from "../models/vehicle_model.js";
import Company from "../models/Company_model.js";
import AppError from "../utils/appError.js";
import * as factory from "./serviceFactory.js";
import { runPaginatedQuery } from "../utils/paginatedQuery.js";
import Email from "../utils/email.js";
import { DATE_BLOCKING_BOOKING_STATUSES } from "../utils/bookingStatus.js";

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
 * Creates a customer booking with server-side price calculation & overlap safety
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

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) throw new AppError("Vehicle not found", 404);

  const effectiveCompanyId = companyId || vehicle.companyId;
  if (!effectiveCompanyId) {
    throw new AppError("Vehicle is not linked to any rental company", 400);
  }

  const availability = await checkAvailability(vehicleId, startDate, endDate);
  if (!availability.isAvailable) {
    throw new AppError("Vehicle is already booked for the selected dates", 400);
  }

  // Booking model pre-validate hook handles all financial calculations
  const newBooking = await Booking.create({
    customerId: userId,
    vehicleId,
    companyId: effectiveCompanyId,
    startDate,
    endDate,
    pickupLocation: pickupLocation || vehicle.pickupLocation,
    pickupMethod: pickupMethod || "BRANCH_PICKUP",
    discountAmount: discountAmount || 0,
    // dailyRate, totalDays, rentalPrice, totalAmount, commissionAmount, companyShare
    // are all auto-calculated by the booking model's pre-validate hook
    dailyRate: vehicle.dailyPrice, // provided as a hint; hook will override
    totalDays: 1, // placeholder; hook will recalculate
    rentalPrice: vehicle.dailyPrice, // placeholder; hook will recalculate
    totalAmount: vehicle.dailyPrice, // placeholder; hook will recalculate
    commissionAmount: 0, // placeholder; hook will recalculate
    companyShare: vehicle.dailyPrice, // placeholder; hook will recalculate
  });

  // Trigger confirmation email if user context is passed
  if (user) {
    await confirmBookingAndNotify(newBooking, user);
  }

  return newBooking;
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
 * Cancel Booking (Applies cancellation policy)
 */
export const cancelBookingById = async (bookingId, user) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError("Booking not found", 404);

  if (
    booking.bookingStatus === "CANCELLED" ||
    booking.bookingStatus === "COMPLETED"
  ) {
    throw new AppError(
      `Cannot cancel a booking that is already ${booking.bookingStatus}`,
      400,
    );
  }

  booking.bookingStatus = "CANCELLED";
  booking.cancelledBy = user.id;
  booking.cancelledAt = new Date();
  await booking.save({ validateBeforeSave: false });

  // Restore vehicle operational status
  await Vehicle.findByIdAndUpdate(booking.vehicleId, {
    operationalStatus: "AVAILABLE",
  });

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
