import Stripe from "stripe";
import Car from "./../models/car_model.js";
import Booking from "./../models/booking_model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

// ─────────────────────────────────────────────────────────────────────────────
// 💳 1. STRIPE CHECKOUT SESSION GATEWAY
// Generates a unique, short-lived Stripe-hosted payment page
// ─────────────────────────────────────────────────────────────────────────────
export const getCheckoutSession = catchAsync(async (req, res, next) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return next(
      new AppError(
        "Stripe is not configured. Please add STRIPE_SECRET_KEY to config.env",
        500,
      ),
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // A. Fetch the vehicle the customer wants to rent
  const car = await Car.findById(req.params.carId);
  if (!car) {
    return next(new AppError("No car found with that ID", 404));
  }

  // B. Calculate rental days from query params
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  if (!startDate || !endDate) {
    return next(new AppError("Please provide startDate and endDate", 400));
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const totalCents = days * car.pricePerDay * 100;

  // C. Construct the hosted checkout session payload
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    success_url: `${req.protocol}://${req.get("host")}/my-rentals?car=${req.params.carId}&user=${req.user.id}&price=${car.pricePerDay}&startDate=${startDate}&endDate=${endDate}&days=${days}`,
    cancel_url: `${req.protocol}://${req.get("host")}/car/${req.params.carId}`,
    customer_email: req.user.email,
    client_reference_id: req.params.carId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: car.pricePerDay * 100,
          product_data: {
            name: `${car.make} ${car.model}`,
            description: `${days} day${days > 1 ? "s" : ""} rental — $${car.pricePerDay}/day`,
            images:
              car.images && car.images.length > 0
                ? [
                    `${req.protocol}://${req.get("host")}/img/cars/${car.images[0]}`,
                  ]
                : [],
          },
        },
        quantity: days,
      },
    ],
  });

  // D. Return session to client — frontend redirects to Stripe payment screen
  res.status(200).json({
    status: "success",
    session,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 💾 1b. STRIPE SUCCESS CALLBACK: Create booking after successful checkout
// Called by the success_url redirect; reads query params appended by Stripe
// ─────────────────────────────────────────────────────────────────────────────
export const createBookingFromCheckout = catchAsync(async (req, res, next) => {
  const { car, user, price, startDate, endDate, days } = req.query;

  if (!car || !user || !price) return next();

  if (user !== req.user.id) {
    return next(new AppError("You can only create bookings for yourself.", 403));
  }

  const totalPrice = Number(price) * Number(days || 1);

  const existing = await Booking.findOne({ car, user: req.user.id, totalPrice });
  if (!existing) {
    await Booking.create({
      car,
      user: req.user.id,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
      totalPrice,
      paid: true,
      status: "confirmed",
    });
    // Mark car as unavailable
    await Car.findByIdAndUpdate(car, { available: false });
  }

  return res.redirect("/my-rentals");
});

// ─────────────────────────────────────────────────────────────────────────────
// 📅 2. USER: Create a booking directly (no Stripe, admin can also use this)
// ─────────────────────────────────────────────────────────────────────────────
export const createMyBooking = catchAsync(async (req, res, next) => {
  // Auto-attach the logged-in user — they don't need to supply their own id
  const { car, startDate, endDate } = req.body;

  if (!car || !startDate || !endDate) {
    return next(
      new AppError("Please provide car, startDate, and endDate", 400),
    );
  }

  // Verify car exists and is available
  const carDoc = await Car.findById(car);
  if (!carDoc) return next(new AppError("No car found with that ID", 404));
  if (!carDoc.available)
    return next(new AppError("This car is not available for booking", 400));

  const newBooking = await Booking.create({
    car,
    user: req.user.id, // always taken from the JWT — cannot be spoofed
    startDate,
    endDate,
  });

  res.status(201).json({
    status: "success",
    data: { booking: newBooking },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 👤 3. USER: Get all MY bookings
// ─────────────────────────────────────────────────────────────────────────────
export const getMyBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id });

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: { bookings },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔑 4. ADMIN: Full CRUD management
// ─────────────────────────────────────────────────────────────────────────────

// Create a booking on behalf of any user (admin use)
export const createBooking = catchAsync(async (req, res, next) => {
  const newBooking = await Booking.create(req.body);
  res.status(201).json({
    status: "success",
    data: { booking: newBooking },
  });
});

// Get every booking in the system
export const getAllBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find();

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: { bookings },
  });
});

// Get a single booking by ID
export const getBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError("No booking found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: { booking },
  });
});

// Update a booking (e.g., status, dates)
export const updateBooking = catchAsync(async (req, res, next) => {
  // If dates are being updated, recalculate totalPrice manually
  // (findByIdAndUpdate bypasses pre-save hooks)
  let updateData = { ...req.body };

  if (req.body.startDate || req.body.endDate) {
    const existing = await Booking.findById(req.params.id);
    if (!existing)
      return next(new AppError("No booking found with that ID", 404));

    const startDate = req.body.startDate
      ? new Date(req.body.startDate)
      : existing.startDate;
    const endDate = req.body.endDate
      ? new Date(req.body.endDate)
      : existing.endDate;

    // Populate car to get pricePerDay
    const car = await Car.findById(existing.car._id || existing.car);
    if (car) {
      const timeDiff = Math.abs(endDate - startDate);
      const rentalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      updateData.totalPrice = rentalDays * car.pricePerDay;
    }
  }

  const booking = await Booking.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!booking) {
    return next(new AppError("No booking found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: { booking },
  });
});

// Delete a booking permanently
export const deleteBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findByIdAndDelete(req.params.id);

  if (!booking) {
    return next(new AppError("No booking found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
