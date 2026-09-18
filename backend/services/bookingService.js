import Stripe from "stripe";
import Booking from "../models/booking_model.js";
import Vehicle from "../models/vehicle_model.js";
import AppError from "../utils/appError.js";
import * as factory from "./serviceFactory.js";
import Email from "../utils/email.js";

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
    bookingStatus: { $in: ["CONFIRMED", "ACTIVE", "PAID"] },
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
 * Stripe checkout session generator
 */
export const createCheckoutSession = async ({
  vehicleId,
  user,
  protocol,
  host,
}) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new AppError("Stripe secret key is not configured.", 500);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) throw new AppError("Vehicle not found", 404);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    success_url: `${protocol}://${host}/my-bookings?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${protocol}://${host}/vehicles/${vehicleId}`,
    customer_email: user.email,
    client_reference_id: vehicleId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: vehicle.dailyPrice * 100,
          product_data: {
            name: `${vehicle.make} ${vehicle.model}`,
            description: `Daily Rate: $${vehicle.dailyPrice}`,
          },
        },
        quantity: 1,
      },
    ],
  });

  return session;
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
