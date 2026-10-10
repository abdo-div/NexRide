import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import {
  moamalatConfig,
  isMoamalatConfigured,
} from "../config/moamalat.js";
import {
  buildCheckoutParams,
  generateMerchantReference as generateBookingRef,
  verifyTransaction,
  finalizeVerifiedPayment,
} from "../services/moamalat.service.js";
/**
 * Validate the booking's stored amount (in LYD)
 */
export function validateAmount(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: false, error: "Amount is required." };
  }
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    return { ok: false, error: "Amount must be a valid number." };
  }
  if (num <= 0) {
    return { ok: false, error: "Amount must be greater than zero." };
  }
  if (num > 1000000) {
    return { ok: false, error: "Amount is too large." };
  }
  return { ok: true, value: num };
}

/**
 * LightBox script & config endpoint.
 * Serves both /api/config and /api/v1/payments/moamalat/config.
 */
export const getGatewayConfig = catchAsync(async (req, res, next) => {
  if (!isMoamalatConfigured()) {
    return res.status(500).json({
      error:
        "Moamalat payment gateway is not configured. Add the MOAMALAT_* environment variables.",
      message:
        "Moamalat payment gateway is not configured. Add the MOAMALAT_* environment variables.",
    });
  }

  // Returns both top-level (manager format) and nested (NexRide data format)
  res.status(200).json({
    status: "success",
    lightBoxUrl: moamalatConfig.lightBoxUrl,
    env: moamalatConfig.env,
    data: {
      lightBoxUrl: moamalatConfig.lightBoxUrl,
      env: moamalatConfig.env,
    },
  });
});

/**
 * Creates a Moamalat payment attempt for an owned, payable booking.
 */
export const createPayment = catchAsync(async (req, res, next) => {
  if (!isMoamalatConfigured()) {
    return res.status(500).json({
      error:
        "Server is not configured. Set MOAMALAT_MID, MOAMALAT_TID, and MOAMALAT_SECURE_KEY in config.env",
    });
  }

  const body = req.body || {};
  if (["amount", "total", "reference"].some((key) => Object.hasOwn(body, key))) {
    throw new AppError("Only bookingId is accepted; payment amount and reference are server-generated.", 400);
  }

  const bookingId = body.bookingId;
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("No booking found with that ID", 404);
  }

  const customerId = req.user?._id || req.user?.id;
  if (!customerId) {
    throw new AppError("You must be logged in to initialize a payment.", 401);
  }
  const bookingCustomerId = booking.customerId?._id ?? booking.customerId;
  if (!bookingCustomerId || bookingCustomerId.toString() !== customerId.toString()) {
    throw new AppError("You can only pay for your own booking.", 403);
  }

  if (
    booking.bookingStatus !== "PENDING_PAYMENT" ||
    booking.paymentStatus !== "UNPAID"
  ) {
    throw new AppError("This booking is not eligible for payment.", 409);
  }

  const completedPayment = await Payment.findOne({
    bookingId: booking._id,
    status: "COMPLETED",
  });
  if (completedPayment) {
    throw new AppError("This booking has already been paid.", 409);
  }

  const check = validateAmount(booking.totalAmount);
  if (!check.ok) {
    throw new AppError(check.error, 400);
  }

  // 1 LYD = 1000 smallest units
  const merchantReference = generateBookingRef(booking._id);
  const params = buildCheckoutParams(booking, merchantReference);

  let paymentDoc = await Payment.findOne({
    bookingId: booking._id,
    paymentGateway: "MOAMALAT",
    status: "PENDING",
  });

  if (paymentDoc) {
    paymentDoc.merchantReference = merchantReference;
    paymentDoc.amount = check.value;
    await paymentDoc.save();
  } else {
    paymentDoc = new Payment({
      bookingId: booking._id,
      customerId: bookingCustomerId,
      companyId: booking.companyId?._id ?? booking.companyId,
      amount: check.value,
      paymentMethod: "MOAMALAT",
      paymentGateway: "MOAMALAT",
      status: "PENDING",
      merchantReference,
    });
    await paymentDoc.save();
  }

  // Response matches both the manager's openLightBox(params) expectations:
  // params.MID, params.TID, params.AmountTrxn, params.MerchantReference, params.TrxDateTime, params.SecureHash
  // AND the NexRide data wrapper!
  res.status(200).json({
    status: "success",
    ...params,
    data: {
      payment: {
        id: paymentDoc._id,
        bookingId: booking._id,
        amount: check.value,
        merchantReference,
      },
      gateway: {
        lightBoxUrl: moamalatConfig.lightBoxUrl,
        env: moamalatConfig.env,
        params,
      },
    },
  });
});

/**
 * Starts a payment for a booking owned by the caller (authenticated route).
 */
export const initiatePayment = createPayment;

/**
 * Verifies a payment against Moamalat's FilterTransactions endpoint.
 * Serves POST /api/payment/verify and POST /api/v1/payments/moamalat/verify.
 */
export const verifyPayment = catchAsync(async (req, res, next) => {
  if (!isMoamalatConfigured()) {
    return res.status(500).json({
      verified: false,
      reason: "Server is not configured.",
      message: "Server is not configured.",
    });
  }

  const { merchantReference, systemReference } = req.body || {};

  if (!merchantReference) {
    return res.status(400).json({
      verified: false,
      reason: "Missing merchantReference.",
      message: "Missing merchantReference.",
    });
  }

  const paymentDoc = await Payment.findOne({
    merchantReference: String(merchantReference),
    paymentGateway: "MOAMALAT",
    paymentMethod: "MOAMALAT",
  });
  if (!paymentDoc) {
    return res.status(404).json({
      verified: false,
      reason: "Original payment record was not found.",
      message: "Original payment record was not found.",
    });
  }

  const bookingId = paymentDoc.bookingId?._id ?? paymentDoc.bookingId;
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("No booking found for this payment.", 404);
  }

  const paymentBookingId = paymentDoc.bookingId?._id ?? paymentDoc.bookingId;
  if (paymentBookingId.toString() !== booking._id.toString()) {
    throw new AppError("Payment does not match the expected booking.", 409);
  }

  const amountMatches =
    Math.round(Number(paymentDoc.amount) * 1000) ===
    Math.round(Number(booking.totalAmount) * 1000);
  if (!amountMatches) {
    throw new AppError("Payment amount does not match the booking amount.", 409);
  }

  if (paymentDoc.status === "COMPLETED") {
    if (
      booking.bookingStatus !== "PAID" ||
      booking.paymentStatus !== "PAID"
    ) {
      throw new AppError("Completed payment has inconsistent booking state.", 409);
    }
    return res.status(200).json({
      verified: true,
      merchantReference,
      systemReference: paymentDoc.transactionId || systemReference || "",
      networkReference: "",
      amount: paymentDoc.amount,
      status: "APPROVED",
      alreadyProcessed: true,
      data: {
        verified: true,
        merchantReference,
        systemReference: paymentDoc.transactionId || systemReference || "",
        networkReference: "",
        amount: paymentDoc.amount,
        status: "APPROVED",
        alreadyProcessed: true,
        booking: {
          id: booking._id,
          bookingStatus: booking.bookingStatus,
          paymentStatus: booking.paymentStatus,
          vehicleId: booking.vehicleId,
        },
      },
    });
  }

  if (
    paymentDoc.status !== "PENDING" ||
    booking.bookingStatus !== "PENDING_PAYMENT" ||
    booking.paymentStatus !== "UNPAID"
  ) {
    throw new AppError("This booking is not eligible for payment verification.", 409);
  }

  const result = await verifyTransaction({
    merchantReference: String(merchantReference),
    expectedAmount: booking.totalAmount,
    systemReference,
  });

  if (!result.verified) {
    return res.status(200).json({
      verified: false,
      reason: result.reason || "Transaction details did not match.",
      status: result.status || null,
      gatewayAmount: result.gatewayAmount || null,
      data: {
        verified: false,
        reason: result.reason || "Transaction details did not match.",
        status: result.status || null,
        gatewayAmount: result.gatewayAmount || null,
      },
    });
  }

  await finalizeVerifiedPayment({
    bookingId: booking._id,
    paymentId: paymentDoc._id,
    systemReference: result.systemReference || systemReference,
    networkReference: result.networkReference,
  });

  const updatedBooking = await Booking.findById(booking._id).select(
    "bookingStatus paymentStatus vehicleId",
  );

  const amountLyd = Number(result.amount) / 1000;

  return res.status(200).json({
    verified: true,
    merchantReference: result.merchantReference,
    systemReference: result.systemReference || String(systemReference || ""),
    networkReference: result.networkReference || null,
    amount: result.amount,
    status: result.status,
    data: {
      verified: true,
      merchantReference: result.merchantReference,
      systemReference: result.systemReference || String(systemReference || ""),
      networkReference: result.networkReference || null,
      amount: amountLyd,
      status: "APPROVED",
      booking: updatedBooking
        ? {
            id: updatedBooking._id,
            bookingStatus: updatedBooking.bookingStatus,
            paymentStatus: updatedBooking.paymentStatus,
            vehicleId: updatedBooking.vehicleId,
          }
        : null,
    },
  });
});