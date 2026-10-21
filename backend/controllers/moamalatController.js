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
  formatTrxDateTime,
  amountToUnits,
  probeCheckoutOrder,
  probePayByCard,
  gatewayAmountForBooking,
} from "../services/moamalat.service.js";
import { releaseUnpaidBooking } from "../services/bookingService.js";
import { isDevelopment } from "../config/env.js";
import logger from "../utils/logger.js";

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

const TERMINAL_PAYMENT_FAILURES = new Set([
  "DECLINED",
  "FAILED",
  "REJECTED",
  "CANCELLED",
  "CANCELED",
]);

/**
 * Only an explicit terminal gateway decision may retire a reservation.
 * NOT_FOUND, transport errors and mismatched/unverifiable data are ambiguous:
 * the customer may already have been charged while the gateway index or our
 * network is lagging. Those bookings remain pending for a safe verification
 * retry or the normal reservation reaper.
 */
export const shouldReleaseAfterVerification = (result) =>
  TERMINAL_PAYMENT_FAILURES.has(
    String(result?.status ?? "").trim().toUpperCase(),
  );

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
 * DEV-ONLY: Returns a test hash computation so you can verify the HMAC logic
 * without creating a real booking. Accepts an optional ?amount=LYD query param.
 * Hit GET /api/v1/payments/moamalat/diagnose to inspect.
 *
 * When pointed at the test gateway it also performs a live order probe (the same
 * call the hosted LightBox page makes) and, with ?pay=1, attempts the card step
 * with Moamalat's published sandbox card so the raw gateway response is visible.
 * Never runs against production and never logs the secure key.
 */
export const diagnose = catchAsync(async (req, res) => {
  if (!isDevelopment()) {
    return res.status(404).json({ error: "Not found." });
  }

  const testAmount = Number(req.query.amount) || 150;
  const testRef = `NX-DIAG-${Date.now().toString(36)}`;
  const fakeBooking = { totalAmount: testAmount };
  const params = buildCheckoutParams(fakeBooking, testRef);
  const transactionTimestamp = formatTrxDateTime();

  const payload = {
    status: "success",
    env: moamalatConfig.env,
    lightBoxUrl: moamalatConfig.lightBoxUrl,
    lightBoxApiUrl: moamalatConfig.lightBoxApiUrl,
    mid: moamalatConfig.merchantId,
    tid: moamalatConfig.terminalId,
    secureKeyLength: moamalatConfig.secureKey.length,
    secureKeyLooksHex: /^[0-9a-f]+$/i.test(moamalatConfig.secureKey),
    timeZone: moamalatConfig.timeZone,
    transactionTimestamp,
    testAmount,
    testAmountUnits: amountToUnits(testAmount),
    params,
    hashString: `Amount=${params.AmountTrxn}&DateTimeLocalTrxn=${params.TrxDateTime}&MerchantId=${params.MID}&MerchantReference=${params.MerchantReference}&TerminalId=${params.TID}`,
    hint: "TrxDateTime must use the LightBox timestamp format and be signed without alteration.",
  };

  // Only ever probe the gateway in the test environment, and allow opting out.
  if (isMoamalatConfigured() && moamalatConfig.env === "test" && req.query.live !== "0") {
    const probe = await probeCheckoutOrder({
      amount: testAmount,
      merchantReference: params.MerchantReference,
    });

    payload.gateway = {
      url: `${moamalatConfig.lightBoxApiUrl}LightboxHostedCheckout`,
      httpStatus: probe.httpStatus,
      error: probe.error ?? null,
      message: probe.gateway?.message ?? null,
      messageMeaning:
        probe.gateway?.message === 7
          ? "success (order created)"
          : probe.gateway?.message === 0
            ? "Order Not Found"
            : null,
      hasToken: Boolean(probe.gateway?.token),
      order: probe.gateway?.orderDetailsModel
        ? {
            merchantName: probe.gateway.orderDetailsModel.merchantName,
            amount: probe.gateway.orderDetailsModel.amount,
            currency: probe.gateway.orderDetailsModel.currency,
            isCyberSource: probe.gateway.orderDetailsModel.isCyberSource,
            isNPG: probe.gateway.orderDetailsModel.isNPG,
            orderID: probe.gateway.orderDetailsModel.orderID,
          }
        : null,
      raw: probe.raw ?? null,
    };

    if (req.query.pay === "1") {
      const card = {
        number: String(req.query.cardNumber || "6395043835180860"),
        expiration: String(req.query.exp || "0127"),
        cvv: String(req.query.cvv || "123"),
        nameOnCard: "DIAGNOSTIC TEST",
      };
      const pay = await probePayByCard({
        order: probe.gateway?.orderDetailsModel,
        token: probe.gateway?.token,
        card,
      });
      payload.payProbe = {
        url: `${moamalatConfig.lightBoxApiUrl}PayByCard`,
        attempted: pay.attempted,
        httpStatus: pay.httpStatus ?? null,
        error: pay.error ?? null,
        message: pay.gateway?.message ?? null,
        errorMessage: pay.gateway?.errorMessage ?? null,
        vpcMessage: pay.gateway?.vpcMessage ?? null,
      };
    }
  }

  return res.status(200).json(payload);
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
  const customerId = req.user?._id || req.user?.id;
  if (!customerId) {
    throw new AppError("You must be logged in to verify a payment.", 401);
  }

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

  const bookingCustomerId = booking.customerId?._id ?? booking.customerId;
  if (
    !bookingCustomerId ||
    bookingCustomerId.toString() !== customerId.toString()
  ) {
    throw new AppError("You can only verify payment for your own booking.", 403);
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
    logger.info(
      {
        event: "payment_verification_replayed",
        paymentId: paymentDoc._id,
        bookingId: booking._id,
        gateway: "MOAMALAT",
      },
      "Completed payment verification replayed",
    );
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
    expectedAmount: gatewayAmountForBooking(booking.totalAmount),
    systemReference,
  });

  if (!result.verified) {
    logger.warn(
      {
        event: "payment_verification_rejected",
        paymentId: paymentDoc._id,
        bookingId: booking._id,
        gateway: "MOAMALAT",
        gatewayStatus: result.status || null,
      },
      "Payment verification rejected",
    );

    const terminalFailure = shouldReleaseAfterVerification(result);
    if (terminalFailure) {
      await releaseUnpaidBooking(booking._id, {
        reason: `Moamalat payment ${String(result.status).toLowerCase()}.`,
      }).catch((err) => {
        logger.warn(
          {
            event: "payment_release_failed",
            bookingId: booking._id,
            err: err.message,
          },
          "Could not release booking after a terminal payment failure",
        );
      });
    }

    return res.status(200).json({
      verified: false,
      retryable: !terminalFailure,
      reason: result.reason || "Transaction details did not match.",
      status: result.status || null,
      gatewayAmount: result.gatewayAmount || null,
      data: {
        verified: false,
        retryable: !terminalFailure,
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

  logger.info(
    {
      event: "payment_completed",
      paymentId: paymentDoc._id,
      bookingId: booking._id,
      gateway: "MOAMALAT",
    },
    "Payment completed",
  );

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

/**
 * Releases an owned booking whose Moamalat payment did not succeed so the
 * vehicle is not left rented to the customer. The LightBox can error or cancel
 * without ever reaching the verify step, so the client calls this to free the
 * car immediately instead of waiting for the reservation to time out.
 */
export const releasePayment = catchAsync(async (req, res, next) => {
  const bookingId = req.body?.bookingId;
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError("No booking found with that ID", 404);
  }

  const customerId = req.user?._id || req.user?.id;
  if (!customerId) {
    throw new AppError("You must be logged in to release a booking.", 401);
  }
  const bookingCustomerId = booking.customerId?._id ?? booking.customerId;
  if (!bookingCustomerId || bookingCustomerId.toString() !== customerId.toString()) {
    throw new AppError("You can only release your own booking.", 403);
  }

  const result = await releaseUnpaidBooking(bookingId, {
    reason: "Moamalat payment was not completed.",
  });

  logger.info(
    {
      event: "payment_released",
      bookingId: booking._id,
      released: result.released,
      gateway: "MOAMALAT",
    },
    "Payment release requested",
  );

  return res.status(200).json({
    status: "success",
    data: {
      released: result.released,
      bookingStatus: result.bookingStatus,
      paymentStatus: result.paymentStatus,
    },
  });
});
