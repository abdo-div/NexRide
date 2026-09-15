import Stripe from "stripe";
import mongoose from "mongoose";
import Payment from "../models/payment_model.js";
import Booking from "../models/booking_model.js";
import Vehicle from "../models/vehicle_model.js";
import AppError from "../utils/appError.js";
import APIFeatures from "../utils/APIFeatures.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Execute payment intent inside a Mongoose ACID Transaction
 */
export const executePaymentProcessing = async (paymentData, customerId) => {
  const { bookingId, paymentMethodId } = paymentData;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) {
      throw new AppError("No booking found with that ID", 404);
    }

    if (booking.status !== "pending") {
      throw new AppError("This booking has already been processed or cancelled", 400);
    }

    // Process payment via Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.totalPrice * 100), // convert to cents
      currency: "usd",
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: { bookingId: booking._id.toString(), customerId },
    });

    // Create payment ledger record
    const payment = await Payment.create(
      [
        {
          booking: booking._id,
          customer: customerId,
          company: booking.company,
          amount: booking.totalPrice,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status === "succeeded" ? "completed" : "pending",
          payoutStatus: "unsettled",
        },
      ],
      { session }
    );

    // Atomically update Booking & Vehicle status
    booking.status = "confirmed";
    booking.paymentStatus = "paid";
    await booking.save({ session });

    await Vehicle.findByIdAndUpdate(
      booking.vehicle,
      { isAvailable: false },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return payment[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Fetch a single payment record by ID
 */
export const fetchPaymentById = async (paymentId) => {
  const payment = await Payment.findById(paymentId)
    .populate("customer", "name email")
    .populate("booking")
    .populate("company", "name");

  if (!payment) {
    throw new AppError("No payment record found with that ID", 404);
  }

  return payment;
};

/**
 * Fetch all payments with filtering for Tenants/Admins
 */
export const fetchAllPayments = async (queryParams, user) => {
  let filter = {};

  // If role is company, restrict strictly to their own revenue ledger
  if (user.role === "company") {
    filter.company = user.company;
  }

  const features = new APIFeatures(Payment.find(filter), queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  return await features.query;
};

/**
 * Calculate company payout summary & platform splits
 */
export const calculateCompanyPayoutSummary = async (companyId) => {
  const matchQuery = companyId ? { company: new mongoose.Types.ObjectId(companyId) } : {};

  const stats = await Payment.aggregate([
    { $match: { ...matchQuery, status: "completed" } },
    {
      $group: {
        _id: "$payoutStatus",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  let totalRevenue = 0;
  let pendingPayouts = 0;
  let settledPayouts = 0;

  stats.forEach((stat) => {
    totalRevenue += stat.totalAmount;
    if (stat._id === "unsettled") pendingPayouts = stat.totalAmount;
    if (stat._id === "settled") settledPayouts = stat.totalAmount;
  });

  return {
    totalRevenue,
    pendingPayouts,
    settledPayouts,
    platformCommissionSplit: totalRevenue * 0.08, // Default 8% platform fee
    netCompanyEarnings: totalRevenue * 0.92,
  };
};

/**
 * Settle company payout (Platform Admin)
 */
export const settlePaymentPayout = async (paymentId) => {
  const payment = await Payment.findByIdAndUpdate(
    paymentId,
    {
      payoutStatus: "settled",
      settledAt: new Date(),
    },
    { new: true, runValidators: true }
  );

  if (!payment) {
    throw new AppError("No payment found with that ID", 404);
  }

  return payment;
};

/**
 * Process raw Stripe webhook signatures
 */
export const processStripeWebhookEvent = async (rawBody, signature) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new AppError(`Webhook Signature Verification Failed: ${err.message}`, 400);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    await Payment.findOneAndUpdate(
      { paymentIntentId: paymentIntent.id },
      { status: "completed" }
    );
  }

  return true;
};