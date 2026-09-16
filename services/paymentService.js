import Stripe from "stripe";
import mongoose from "mongoose";
import Payment from "../models/payment_model.js";
import Booking from "../models/booking_model.js";
import Vehicle from "../models/vehicle_model.js";
import AppError from "../utils/appError.js";
import APIFeatures from "../utils/APIFeatures.js";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Execute payment intent inside a Mongoose ACID Transaction
 */
export const executePaymentProcessing = async (paymentData, customerId) => {
  const { bookingId, paymentMethod } = paymentData;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) {
      throw new AppError("No booking found with that ID", 404);
    }

    if (booking.bookingStatus !== "PENDING_PAYMENT") {
      throw new AppError(
        "This booking has already been processed or cancelled",
        400,
      );
    }

    // Create payment ledger record
    const payment = await Payment.create(
      [
        {
          bookingId: booking._id,
          customerId,
          companyId: booking.companyId,
          amount: booking.totalAmount,
          paymentMethod: paymentMethod || "CASH_ON_DELIVERY",
          status: "COMPLETED",
          payoutStatus: "UNSETTLED",
          paidAt: new Date(),
        },
      ],
      { session },
    );

    // Atomically update Booking status
    booking.bookingStatus = "PAID";
    booking.paymentStatus = "PAID";
    await booking.save({ session, validateBeforeSave: false });

    await Vehicle.findByIdAndUpdate(
      booking.vehicleId,
      { operationalStatus: "UNAVAILABLE" },
      { session },
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
    .populate("customerId", "name email")
    .populate("bookingId")
    .populate("companyId", "name");

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
    filter.companyId = user.company;
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
  const matchQuery = companyId
    ? { companyId: new mongoose.Types.ObjectId(companyId) }
    : {};

  const stats = await Payment.aggregate([
    { $match: { ...matchQuery, status: "COMPLETED" } },
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
    if (stat._id === "UNSETTLED") pendingPayouts = stat.totalAmount;
    if (stat._id === "SETTLED") settledPayouts = stat.totalAmount;
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
      payoutStatus: "SETTLED",
      payoutSettledAt: new Date(),
    },
    { new: true, runValidators: true },
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
  if (!stripe) {
    throw new AppError(
      "Payment processing is not configured. Add STRIPE_SECRET_KEY.",
      500,
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    throw new AppError(
      `Webhook Signature Verification Failed: ${err.message}`,
      400,
    );
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    await Payment.findOneAndUpdate(
      { transactionId: paymentIntent.id },
      { status: "COMPLETED" },
    );
  }

  return true;
};
