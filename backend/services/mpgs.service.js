import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import AppError from "../utils/appError.js";
import { createConfiguredMpgsProvider } from "../config/mpgs.js";
import { resolveClientUrl } from "../config/clientUrl.js";
import {
  generateOrderId,
  normalizeOperation,
} from "../payments/providers/mpgs/mpgs.validation.js";
import { releaseVehicleHold } from "./reservationHold.service.js";
import { releaseUnpaidBooking } from "./bookingService.js";

const PAYMENT_SESSION_TTL_MS = 15 * 60 * 1000;

const idOf = (value) => (value?._id ?? value)?.toString();
const amountsMatch = (left, right) =>
  Math.round(Number(left) * 1000) === Math.round(Number(right) * 1000);

const assertOwnedPayableBooking = (booking, customerId) => {
  if (!booking) throw new AppError("No booking found with that ID", 404);
  if (!customerId || idOf(booking.customerId) !== String(customerId)) {
    throw new AppError("You can only pay for your own booking.", 403);
  }
  if (
    booking.bookingStatus !== "PENDING_PAYMENT" ||
    booking.paymentStatus !== "UNPAID"
  ) {
    throw new AppError("This booking is not eligible for payment.", 409);
  }
  if (!Number.isFinite(Number(booking.totalAmount)) || Number(booking.totalAmount) <= 0) {
    throw new AppError("The booking has an invalid payment amount.", 409);
  }
};

/** Atomically converts a verified MPGS attempt into paid ledger/booking state. */
export const finalizeMpgsPayment = async ({
  bookingId,
  paymentId,
  transactionId,
  mongooseImpl = mongoose,
  BookingModel = Booking,
  PaymentModel = Payment,
  releaseHold = releaseVehicleHold,
  expectedGateway = "MPGS",
}) => {
  const session = await mongooseImpl.startSession();
  let booking;
  let payment;
  let alreadyProcessed = false;
  try {
    await session.withTransaction(async () => {
      booking = await BookingModel.findById(bookingId).session(session);
      payment = await PaymentModel.findById(paymentId).session(session);
      if (!booking) throw new AppError("No booking found with that ID", 404);
      if (!payment) throw new AppError("No payment record found", 404);
      if (idOf(payment.bookingId) !== idOf(booking._id)) {
        throw new AppError("Payment does not belong to the expected booking.", 409);
      }
      if (payment.paymentGateway !== expectedGateway || payment.paymentMethod !== "MPGS") {
        throw new AppError(`Payment was not initialized for ${expectedGateway}.`, 409);
      }
      if (!amountsMatch(payment.amount, booking.totalAmount)) {
        throw new AppError("Payment amount does not match the booking amount.", 409);
      }

      alreadyProcessed =
        payment.status === "COMPLETED" &&
        booking.bookingStatus === "PAID" &&
        booking.paymentStatus === "PAID";
      if (alreadyProcessed) return;
      if (
        payment.status !== "PENDING" ||
        booking.bookingStatus !== "PENDING_PAYMENT" ||
        booking.paymentStatus !== "UNPAID"
      ) {
        throw new AppError("Payment or booking is not eligible for finalization.", 409);
      }

      booking.bookingStatus = "PAID";
      booking.paymentStatus = "PAID";
      booking.paymentSessionExpiresAt = undefined;
      await booking.save({ session, validateBeforeSave: false });

      payment.status = "COMPLETED";
      if (transactionId) payment.transactionId = transactionId;
      payment.paidAt = new Date();
      await payment.save({ session });
    });
  } finally {
    await session.endSession();
  }

  if (!alreadyProcessed && booking?.vehicleId) {
    await releaseHold(booking.vehicleId).catch(() => {});
  }
  return { payment, booking, alreadyProcessed };
};

/** NexRide adapter around the application-independent MPGS provider. */
export class NexRideMpgsService {
  constructor({
    BookingModel = Booking,
    PaymentModel = Payment,
    providerFactory = createConfiguredMpgsProvider,
    finalizePayment = finalizeMpgsPayment,
    releaseBooking = releaseUnpaidBooking,
    clientUrlFactory = resolveClientUrl,
    env = process.env,
  } = {}) {
    this.Booking = BookingModel;
    this.Payment = PaymentModel;
    this.providerFactory = providerFactory;
    this.finalizePayment = finalizePayment;
    this.releaseBooking = releaseBooking;
    this.clientUrlFactory = clientUrlFactory;
    this.env = env;
  }

  async initialize({ bookingId, customerId }) {
    const provider = this.providerFactory();
    const booking = await this.Booking.findById(bookingId);
    assertOwnedPayableBooking(booking, customerId);

    const completed = await this.Payment.findOne({
      bookingId: booking._id,
      status: "COMPLETED",
    });
    if (completed) throw new AppError("This booking has already been paid.", 409);

    const operation = normalizeOperation(this.env.MPGS_OPERATION || "PURCHASE");
    let payment = await this.Payment.findOne({
      bookingId: booking._id,
      paymentGateway: "MPGS",
      status: "PENDING",
    });

    if (payment?.gatewaySessionId && payment?.gatewaySuccessIndicator) {
      if (
        booking.paymentSessionExpiresAt &&
        new Date(booking.paymentSessionExpiresAt).getTime() <= Date.now()
      ) {
        throw new AppError("The MPGS checkout session has expired.", 409);
      }
      return {
        payment,
        booking,
        checkout: {
          provider: "MPGS",
          orderId: payment.merchantReference,
          amount: String(payment.amount),
          currency: payment.currency,
          operation: payment.gatewayOperation || operation,
          sessionId: payment.gatewaySessionId,
          sessionVersion: null,
          successIndicator: payment.gatewaySuccessIndicator,
          reused: true,
        },
      };
    }

    const orderId = payment?.merchantReference ||
      generateOrderId(`NX${String(booking._id).slice(-6)}`);
    if (payment) {
      if (!amountsMatch(payment.amount, booking.totalAmount)) {
        throw new AppError("Pending payment amount does not match the booking.", 409);
      }
    } else {
      payment = new this.Payment({
        bookingId: booking._id,
        customerId: booking.customerId?._id ?? booking.customerId,
        companyId: booking.companyId?._id ?? booking.companyId,
        amount: booking.totalAmount,
        currency: this.env.MPGS_CURRENCY,
        paymentMethod: "MPGS",
        paymentGateway: "MPGS",
        merchantReference: orderId,
        gatewayOperation: operation,
        status: "PENDING",
      });
    }
    await payment.save();

    booking.paymentSessionExpiresAt = new Date(Date.now() + PAYMENT_SESSION_TTL_MS);
    await booking.save({ validateBeforeSave: false });

    const clientUrl = this.clientUrlFactory();
    const checkout = await provider.createCheckout({
      orderId,
      amount: String(booking.totalAmount),
      description: `NexRide booking ${String(booking._id)}`,
      merchantName: this.env.MPGS_MERCHANT_NAME || "NexRide",
      operation,
      returnUrl:
        `${clientUrl}/?orderId=${encodeURIComponent(orderId)}#/payment/mpgs/return`,
      cancelUrl:
        `${clientUrl}/?orderId=${encodeURIComponent(orderId)}#/payment/mpgs/cancel`,
    });

    payment.gatewaySessionId = checkout.sessionId;
    payment.gatewaySuccessIndicator = checkout.successIndicator;
    await payment.save();

    return { payment, booking, checkout };
  }

  async verify({ orderId, resultIndicator, customerId }) {
    const payment = await this.Payment.findOne({
      merchantReference: orderId,
      paymentGateway: "MPGS",
      paymentMethod: "MPGS",
    });
    if (!payment) throw new AppError("Original MPGS payment was not found.", 404);

    const booking = await this.Booking.findById(payment.bookingId?._id ?? payment.bookingId);
    if (!booking) throw new AppError("No booking found for this payment.", 404);
    if (!customerId || idOf(booking.customerId) !== String(customerId)) {
      throw new AppError("You can only verify payment for your own booking.", 403);
    }
    if (!amountsMatch(payment.amount, booking.totalAmount)) {
      throw new AppError("Payment amount does not match the booking amount.", 409);
    }

    if (payment.status === "COMPLETED") {
      return {
        verified: true,
        outcome: "SUCCEEDED",
        alreadyProcessed: true,
        payment,
        booking,
        indicatorMatches:
          !resultIndicator || resultIndicator === payment.gatewaySuccessIndicator,
      };
    }
    if (payment.status !== "PENDING") {
      throw new AppError("This payment is no longer pending verification.", 409);
    }

    const verification = await this.providerFactory().verifyPayment({
      orderId,
      expectedAmount: String(payment.amount),
      expectedCurrency: payment.currency,
      operation: payment.gatewayOperation || "PURCHASE",
    });
    const indicatorMatches =
      !resultIndicator || resultIndicator === payment.gatewaySuccessIndicator;

    if (verification.verified) {
      const finalized = await this.finalizePayment({
        bookingId: booking._id,
        paymentId: payment._id,
        transactionId: verification.transactionId || orderId,
      });
      return { ...verification, ...finalized, indicatorMatches };
    }

    if (verification.outcome === "FAILED") {
      payment.status = "FAILED";
      await payment.save();
      await this.releaseBooking(booking._id, {
        reason: `MPGS payment ${String(verification.gatewayStatus).toLowerCase()}.`,
      }).catch(() => {});
    }
    return { ...verification, payment, booking, indicatorMatches };
  }
}
