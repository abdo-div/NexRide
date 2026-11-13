import crypto from "node:crypto";

import mongoose from "mongoose";

import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import AppError from "../utils/appError.js";

const configuration = () => ({
  baseUrl: (process.env.PAYMENT_AGGREGATOR_URL || "").replace(/\/+$/, ""),
  apiKey: process.env.PAYMENT_AGGREGATOR_API_KEY || "",
  webhookSecret: process.env.PAYMENT_AGGREGATOR_WEBHOOK_SECRET || "",
});

const requireClientConfiguration = () => {
  const config = configuration();
  if (!config.baseUrl || !config.apiKey) {
    throw new AppError("Payment service is not configured.", 503);
  }
  return config;
};

const idOf = (value) => (value?._id ?? value)?.toString();

export const initializeAggregatorPayment = async ({ bookingId, customerId }) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError("No booking found with that ID", 404);
  if (idOf(booking.customerId) !== idOf(customerId)) {
    throw new AppError("You can only pay for your own booking.", 403);
  }
  if (booking.bookingStatus !== "PENDING_PAYMENT" || booking.paymentStatus !== "UNPAID") {
    throw new AppError("This booking is not eligible for payment.", 409);
  }

  const reusable = await Payment.findOne({
    bookingId: booking._id,
    paymentGateway: "PAYFLOW",
    status: "PENDING",
    aggregatorCheckoutExpiresAt: { $gt: new Date() },
  }).select("+aggregatorCheckoutUrl").sort({ createdAt: -1 });
  if (reusable?.aggregatorCheckoutUrl) {
    return { booking, payment: reusable, checkoutUrl: reusable.aggregatorCheckoutUrl, reused: true };
  }

  const [payment] = await Payment.create([{
    bookingId: booking._id,
    customerId: booking.customerId,
    companyId: booking.companyId,
    amount: booking.totalAmount,
    currency: "LYD",
    paymentMethod: "PAYFLOW",
    paymentGateway: "PAYFLOW",
    status: "PENDING",
    payoutStatus: "UNSETTLED",
  }]);

  const config = requireClientConfiguration();
  const body = {
    order_reference: `NXR-${booking._id}`,
    amount: Number(booking.totalAmount).toFixed(3),
    currency: "LYD",
    description: `NexRide booking ${booking._id}`,
    return_url: `${process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173"}/booking-confirmed/${booking.vehicleId}?booking=${booking._id}`,
    metadata: { booking_id: String(booking._id), nexride_payment_id: String(payment._id) },
  };

  let response;
  try {
    response = await fetch(`${config.baseUrl}/v1/payments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
        "idempotency-key": `nexride-${booking._id}-${payment._id}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    payment.status = "FAILED";
    await payment.save();
    throw new AppError("Payment service is temporarily unavailable.", 502);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.payment_id || !payload.checkout_url) {
    payment.status = "FAILED";
    await payment.save();
    throw new AppError(payload?.error?.message || "Payment service rejected the request.", 502);
  }

  payment.aggregatorPaymentId = payload.payment_id;
  payment.aggregatorCheckoutUrl = payload.checkout_url;
  payment.aggregatorCheckoutExpiresAt = new Date(payload.checkout_expires_at);
  await payment.save();
  booking.paymentSessionExpiresAt = payment.aggregatorCheckoutExpiresAt;
  await booking.save();
  return { booking, payment, checkoutUrl: payload.checkout_url, reused: false };
};

export const verifyAggregatorWebhook = ({ rawBody, timestamp, signature }) => {
  const { webhookSecret } = configuration();
  if (!webhookSecret) throw new AppError("Webhook receiver is not configured.", 503);
  if (!/^\d{10}$/.test(timestamp || "") || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    throw new AppError("Invalid webhook timestamp.", 401);
  }
  const expected = `v1=${crypto.createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
  const actualBuffer = Buffer.from(signature || "");
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new AppError("Invalid webhook signature.", 401);
  }
};

export const processAggregatorWebhook = async (event) => {
  if (!event?.id || !event?.type) {
    throw new AppError("Invalid webhook payload.", 400);
  }
  if (event.type === "webhook.test") return;
  if (!event?.data?.payment_id) throw new AppError("Invalid payment webhook payload.", 400);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findOne({ aggregatorPaymentId: event.data.payment_id })
        .select("+aggregatorEventIds")
        .session(session);
      if (!payment) throw new AppError("Payment record not found.", 404);
      payment.aggregatorEventIds ??= [];
      if (payment.aggregatorEventIds.includes(event.id)) return;
      const booking = await Booking.findById(payment.bookingId).session(session);
      if (!booking) throw new AppError("Booking record not found.", 404);

      if (event.type === "payment.succeeded") {
        payment.status = "COMPLETED";
        payment.transactionId = payment.aggregatorPaymentId;
        payment.paidAt = payment.paidAt || new Date();
        booking.paymentStatus = "PAID";
        if (booking.bookingStatus === "PENDING_PAYMENT") booking.bookingStatus = "PAID";
        booking.paymentSessionExpiresAt = null;
      } else if (["payment.failed", "payment.cancelled"].includes(event.type)) {
        payment.status = "FAILED";
        booking.paymentSessionExpiresAt = null;
      } else if (event.type === "payment.expired") {
        payment.status = "EXPIRED";
        booking.paymentSessionExpiresAt = null;
      }
      payment.aggregatorEventIds.push(event.id);
      await payment.save({ session });
      await booking.save({ session });
    });
  } finally {
    await session.endSession();
  }
};
