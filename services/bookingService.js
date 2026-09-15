import Stripe from "stripe";
import Booking from "../models/booking_model.js";
import Car from "../models/car_model.js";
import AppError from "../utils/appError.js";
import * as factory from "./serviceFactory.js";

export const getAllBookings = factory.getAll(Booking);
export const getBookingById = factory.getOne(Booking);

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
    car: vehicleId,
    status: { $in: ["confirmed", "active"] },
    startDate: { $lt: end },
    endDate: { $gt: start },
  });

  return { isAvailable: !overlappingBooking };
};

/**
 * Creates a customer booking with server-side price calculation & overlap safety
 */
export const createCustomerBooking = async (userId, bookingData) => {
  const { car: vehicleId, startDate, endDate } = bookingData;

  const availability = await checkAvailability(vehicleId, startDate, endDate);
  if (!availability.isAvailable) {
    throw new AppError("Vehicle is already booked for the selected dates", 400);
  }

  const car = await Car.findById(vehicleId);
  if (!car) throw new AppError("Vehicle not found", 404);

  const start = new Date(startDate);
  const end = new Date(endDate);
  const rentalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const totalPrice = rentalDays * car.pricePerDay;

  const newBooking = await Booking.create({
    car: vehicleId,
    user: userId,
    company: car.company, // Scope to car's fleet tenant owner
    startDate: start,
    endDate: end,
    totalPrice,
    status: "confirmed",
  });

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
  const car = await Car.findById(vehicleId);
  if (!car) throw new AppError("Vehicle not found", 404);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    success_url: `${protocol}://${host}/my-bookings?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${protocol}://${host}/cars/${vehicleId}`,
    customer_email: user.email,
    client_reference_id: vehicleId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: car.pricePerDay * 100,
          product_data: {
            name: `${car.make} ${car.model}`,
            description: `Daily Rate: $${car.pricePerDay}`,
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
  return await Booking.find({ user: userId }).populate("car");
};

/**
 * Company Tenant Fleet Bookings
 */
export const fetchCompanyFleetBookings = async (companyId, query) => {
  // Scopes queries to company fleet tenant
  const filter = companyId ? { company: companyId } : {};
  return await Booking.find(filter).populate("car user");
};

/**
 * Cancel Booking (Applies cancellation policy)
 */
export const cancelBookingById = async (bookingId, user) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError("Booking not found", 404);

  if (booking.status === "cancelled" || booking.status === "completed") {
    throw new AppError(`Cannot cancel a booking that is already ${booking.status}`, 400);
  }

  booking.status = "cancelled";
  await booking.save();

  // Restore car availability state
  await Car.findByIdAndUpdate(booking.car, { available: true });

  return booking;
};

/**
 * Company Fleet Status Lifecycle Transition (CONFIRMED -> ACTIVE -> COMPLETED)
 */
export const updateLifecycleStatus = async (bookingId, status) => {
  const validStatuses = ["confirmed", "active", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    throw new AppError("Invalid booking status value", 400);
  }

  const booking = await Booking.findByIdAndUpdate(
    bookingId,
    { status },
    { new: true, runValidators: true }
  );

  if (!booking) throw new AppError("Booking not found", 404);
  return booking;
};