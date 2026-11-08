import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { getMpgsPublicConfig } from "../config/mpgs.js";
import { NexRideMpgsService } from "../services/mpgs.service.js";
import logger from "../utils/logger.js";
import { processPendingMpgsRefundByBooking } from "../services/mpgsRefund.service.js";
import { MpgsSimulatorService } from "../services/mpgsSimulator.service.js";

const service = new NexRideMpgsService();
const simulator = new MpgsSimulatorService();

export const getMpgsConfig = catchAsync(async (_req, res) => {
  const config = getMpgsPublicConfig();
  return res.status(200).json({ status: "success", data: config });
});

export const initiateMpgsPayment = catchAsync(async (req, res) => {
  const customerId = req.user?._id ?? req.user?.id;
  if (!customerId) throw new AppError("You must be logged in to pay.", 401);

  const result = await service.initialize({
    bookingId: req.body.bookingId,
    customerId,
  });
  logger.info(
    {
      event: "mpgs_checkout_initialized",
      bookingId: result.booking._id,
      paymentId: result.payment._id,
      orderId: result.checkout.orderId,
    },
    "MPGS checkout initialized",
  );

  return res.status(200).json({
    status: "success",
    data: {
      paymentId: result.payment._id,
      bookingId: result.booking._id,
      ...result.checkout,
    },
  });
});

export const verifyMpgsPayment = catchAsync(async (req, res) => {
  const customerId = req.user?._id ?? req.user?.id;
  if (!customerId) throw new AppError("You must be logged in to verify payment.", 401);

  const result = await service.verify({
    orderId: req.body.orderId,
    resultIndicator: req.body.resultIndicator,
    customerId,
  });
  logger.info(
    {
      event: result.verified ? "mpgs_payment_verified" : "mpgs_payment_unverified",
      bookingId: result.booking?._id,
      paymentId: result.payment?._id,
      orderId: req.body.orderId,
      outcome: result.outcome,
    },
    "MPGS verification completed",
  );

  return res.status(200).json({
    status: "success",
    data: {
      verified: result.verified,
      outcome: result.outcome,
      alreadyProcessed: result.alreadyProcessed ?? false,
      indicatorMatches: result.indicatorMatches,
      orderId: req.body.orderId,
      gatewayStatus: result.gatewayStatus ?? null,
      transactionId: result.transactionId ?? result.payment?.transactionId ?? null,
      booking: result.booking
        ? {
            id: result.booking._id,
            bookingStatus: result.booking.bookingStatus,
            paymentStatus: result.booking.paymentStatus,
            vehicleId:
              result.booking.vehicleId?._id ?? result.booking.vehicleId ?? null,
          }
        : null,
    },
  });
});

export const processMpgsRefund = catchAsync(async (req, res) => {
  const customerId = req.user?._id ?? req.user?.id;
  if (!customerId) throw new AppError("You must be logged in to process a refund.", 401);

  const result = await processPendingMpgsRefundByBooking(req.body.bookingId, {
    customerId,
  });
  return res.status(200).json({
    status: "success",
    data: {
      skipped: result.skipped ?? false,
      reason: result.reason ?? null,
      outcome: result.outcome ?? null,
      refunded: result.refunded ?? result.alreadyProcessed ?? false,
      alreadyProcessed: result.alreadyProcessed ?? false,
      refundId: result.refund?._id ?? null,
      refundTransactionId: result.refund?.gatewayRefundTransactionId ?? null,
      gatewayCode: result.refund?.gatewayCode ?? null,
    },
  });
});

export const initiateMpgsSimulation = catchAsync(async (req, res) => {
  const customerId = req.user?._id ?? req.user?.id;
  if (!customerId) throw new AppError("You must be logged in to pay.", 401);
  const result = await simulator.initialize({
    bookingId: req.body.bookingId,
    customerId,
  });
  return res.status(200).json({ status: "success", data: result.checkout });
});

export const completeMpgsSimulation = catchAsync(async (req, res) => {
  const customerId = req.user?._id ?? req.user?.id;
  if (!customerId) throw new AppError("You must be logged in to pay.", 401);
  const result = await simulator.complete({
    orderId: req.body.orderId,
    customerId,
  });
  return res.status(200).json({
    status: "success",
    data: {
      verified: true,
      simulated: true,
      alreadyProcessed: result.alreadyProcessed ?? false,
      orderId: req.body.orderId,
      booking: {
        id: result.booking._id,
        bookingStatus: result.booking.bookingStatus,
        paymentStatus: result.booking.paymentStatus,
        vehicleId: result.booking.vehicleId?._id ?? result.booking.vehicleId,
      },
    },
  });
});
