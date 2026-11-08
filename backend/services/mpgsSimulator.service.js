import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import AppError from "../utils/appError.js";
import { generateOrderId } from "../payments/providers/mpgs/mpgs.validation.js";
import { finalizeMpgsPayment } from "./mpgs.service.js";

const idOf = (value) => (value?._id ?? value)?.toString();

export const isMpgsSimulatorEnabled = (env = process.env) =>
  env.NODE_ENV !== "production" &&
  String(env.MPGS_SIMULATOR || "true").toLowerCase() !== "false";

export class MpgsSimulatorService {
  constructor({
    BookingModel = Booking,
    PaymentModel = Payment,
    finalizePayment = finalizeMpgsPayment,
    env = process.env,
  } = {}) {
    this.Booking = BookingModel;
    this.Payment = PaymentModel;
    this.finalizePayment = finalizePayment;
    this.env = env;
  }

  assertEnabled() {
    if (!isMpgsSimulatorEnabled(this.env)) {
      throw new AppError("MPGS Simulator is disabled.", 404);
    }
  }

  async initialize({ bookingId, customerId }) {
    this.assertEnabled();
    const booking = await this.Booking.findById(bookingId);
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
    const completed = await this.Payment.findOne({
      bookingId: booking._id,
      status: "COMPLETED",
    });
    if (completed) throw new AppError("This booking has already been paid.", 409);

    let payment = await this.Payment.findOne({
      bookingId: booking._id,
      paymentGateway: "MPGS_SIMULATOR",
      status: "PENDING",
    });
    if (!payment) {
      payment = new this.Payment({
        bookingId: booking._id,
        customerId: booking.customerId?._id ?? booking.customerId,
        companyId: booking.companyId?._id ?? booking.companyId,
        amount: booking.totalAmount,
        currency: "LYD",
        paymentMethod: "MPGS",
        paymentGateway: "MPGS_SIMULATOR",
        merchantReference: generateOrderId(`SIM${String(booking._id).slice(-6)}`),
        gatewayOperation: "PURCHASE",
        gatewaySessionId: `SIM-SESSION-${Date.now().toString(36)}`,
        gatewaySuccessIndicator: "SIMULATED",
        isSimulated: true,
        status: "PENDING",
      });
      await payment.save();
    }
    return {
      payment,
      booking,
      checkout: {
        provider: "MPGS_SIMULATOR",
        orderId: payment.merchantReference,
        sessionId: payment.gatewaySessionId,
        amount: String(payment.amount),
        currency: payment.currency,
        simulated: true,
      },
    };
  }

  async complete({ orderId, customerId }) {
    this.assertEnabled();
    const payment = await this.Payment.findOne({
      merchantReference: orderId,
      paymentGateway: "MPGS_SIMULATOR",
      paymentMethod: "MPGS",
      isSimulated: true,
    });
    if (!payment) throw new AppError("Simulated MPGS payment was not found.", 404);
    const booking = await this.Booking.findById(payment.bookingId?._id ?? payment.bookingId);
    if (!booking) throw new AppError("No booking found for this payment.", 404);
    if (!customerId || idOf(booking.customerId) !== String(customerId)) {
      throw new AppError("You can only complete your own simulated payment.", 403);
    }
    if (payment.status === "COMPLETED") {
      return { payment, booking, alreadyProcessed: true };
    }
    return this.finalizePayment({
      bookingId: booking._id,
      paymentId: payment._id,
      transactionId: `SIM-TXN-${String(payment._id).slice(-20)}`,
      expectedGateway: "MPGS_SIMULATOR",
    });
  }
}
