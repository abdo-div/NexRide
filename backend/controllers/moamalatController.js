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
  generateMerchantReference,
  verifyTransaction,
  finalizeVerifiedPayment,
} from "../services/moamalat.service.js";

/**
 * LightBox script endpoint, public by design: the browser must fetch it before
 * it can inject the Moamalat script. Exposes no secrets, only URLs + env.
 */
export const getGatewayConfig = catchAsync(async (req, res, next) => {
  if (!isMoamalatConfigured()) {
    return next(
      new AppError(
        "Moamalat payment gateway is not configured. Add the MOAMALAT_* environment variables.",
        500,
      ),
    );
  }

  res.status(200).json({
    status: "success",
    data: { lightBoxUrl: moamalatConfig.lightBoxUrl, env: moamalatConfig.env },
  });
});

/**
 * Starts a payment for a booking owned by the caller. Creates/reuses the
 * PENDING ledger record, generates a fresh merchant reference and returns the
 * signed params the LightBox needs. Idempotency is enforced by the shared
 * Idempotency-Key middleware on the /payments mount.
 */
export const initiatePayment = catchAsync(async (req, res, next) => {
  const { bookingId } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(new AppError("No booking found with that ID", 404));
  }
  if (String(booking.customerId._id || booking.customerId) !== req.user.id) {
    return next(new AppError("You can only pay for your own booking", 403));
  }
  if (booking.bookingStatus !== "PENDING_PAYMENT") {
    return next(
      new AppError(
        booking.paymentStatus === "PAID"
          ? "This booking has already been paid"
          : "This booking is not awaiting payment",
        400,
      ),
    );
  }

  const merchantReference = generateMerchantReference(bookingId);

  // One PENDING ledger row per booking: each re-init rotates the merchant
  // reference (old one is overwritten, keeping the sparse unique index clean).
  let payment = await Payment.findOne({
    bookingId,
    paymentGateway: "MOAMALAT",
    status: "PENDING",
  });

  if (payment) {
    payment.merchantReference = merchantReference;
  } else {
    payment = new Payment({
      bookingId: booking._id,
      customerId: req.user.id,
      companyId: booking.companyId,
      amount: booking.totalAmount,
      paymentMethod: "MOAMALAT",
      paymentGateway: "MOAMALAT",
      status: "PENDING",
      merchantReference,
    });
  }
  await payment.save();

  const params = buildCheckoutParams(booking, merchantReference);

  res.status(200).json({
    status: "success",
    data: {
      payment: {
        id: payment._id,
        bookingId: booking._id,
        amount: booking.totalAmount,
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
 * Verifies a payment against Moamalat's FilterTransactions endpoint and, on
 * approval, finalizes booking + payment + vehicle atomically. Always returns a
 * 200 with { verified } — the gateway decision is reported in the body, not as
 * an HTTP error, mirroring how the LightBox contract is consumed.
 */
export const verifyPayment = catchAsync(async (req, res, next) => {
  const { merchantReference, systemReference } = req.body;

  const payment = await Payment.findOne({
    merchantReference,
    customerId: req.user.id,
  });
  if (!payment) {
    return next(
      new AppError("No payment found for that merchant reference", 404),
    );
  }

  // Already finalized by a previous verify — idempotent success.
  if (payment.status === "COMPLETED") {
    return res.status(200).json({
      status: "success",
      data: {
        verified: true,
        merchantReference,
        systemReference: payment.transactionId || systemReference || "",
        networkReference: "",
        amount: payment.amount,
        status: "APPROVED",
        alreadyProcessed: true,
      },
    });
  }

  const result = await verifyTransaction({
    merchantReference,
    expectedAmount: payment.amount,
  });

  if (!result.verified) {
    return res.status(200).json({
      status: "success",
      data: {
        verified: false,
        merchantReference,
        systemReference: result.systemReference || systemReference || "",
        networkReference: result.networkReference,
        amount: result.amount / 1000,
        status: result.status,
      },
    });
  }

  await finalizeVerifiedPayment({
    bookingId: payment.bookingId,
    paymentId: payment._id,
    systemReference: result.systemReference || systemReference,
    networkReference: result.networkReference,
  });

  const booking = await Booking.findById(payment.bookingId).select(
    "bookingStatus paymentStatus",
  );

  res.status(200).json({
    status: "success",
    data: {
      verified: true,
      merchantReference,
      systemReference: result.systemReference || systemReference,
      networkReference: result.networkReference,
      amount: result.amount / 1000,
      status: "APPROVED",
      booking: booking
        ? {
            id: booking._id,
            bookingStatus: booking.bookingStatus,
            paymentStatus: booking.paymentStatus,
          }
        : null,
    },
  });
});