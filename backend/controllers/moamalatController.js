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
  generateSecureHash,
  formatTrxDateTime,
  verifyTransaction,
  finalizeVerifiedPayment,
} from "../services/moamalat.service.js";
import crypto from "node:crypto";

// In-memory cache for standalone / demo / quick payment tracking matching manager reference
export const pendingPayments = new Map();

/**
 * Validate incoming amount (in LYD)
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
 * Generate a standalone merchant reference matching manager format
 */
export function generateMerchantReference() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `PAY-${ts}-${rand}`;
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
 * Standalone & Booking payment creation endpoint.
 * Serves POST /api/payment/create and POST /api/v1/payments/moamalat/create (and /init).
 */
export const createPayment = catchAsync(async (req, res, next) => {
  if (!isMoamalatConfigured()) {
    return res.status(500).json({
      error:
        "Server is not configured. Set MOAMALAT_MID, MOAMALAT_TID, and MOAMALAT_SECURE_KEY in config.env",
    });
  }

  let { amount, reference, bookingId } = req.body || {};

  let booking = null;
  if (bookingId) {
    booking = await Booking.findById(bookingId).catch(() => null);
    if (booking && amount === undefined) {
      amount = booking.totalAmount;
    }
  }

  const check = validateAmount(amount);
  if (!check.ok) {
    return res.status(400).json({
      error: check.error,
      message: check.error,
    });
  }

  // 1 LYD = 1000 smallest units
  const amountTrxn = Math.round(check.value * 1000);

  const merchantReference =
    reference && String(reference).trim()
      ? String(reference).trim().slice(0, 40)
      : bookingId
        ? generateBookingRef(bookingId)
        : generateMerchantReference();

  const trxDateTime = formatTrxDateTime(new Date());

  const hashData = {
    amount: amountTrxn,
    trxDateTime,
    merchantId: moamalatConfig.merchantId,
    merchantReference,
    terminalId: moamalatConfig.terminalId,
  };

  const secureHash = generateSecureHash(hashData);

  // Store in pendingPayments in-memory map
  pendingPayments.set(merchantReference, {
    merchantReference,
    amountTrxn: String(amountTrxn),
    amountLyd: check.value,
    bookingId: bookingId || null,
    createdAt: Date.now(),
    verified: false,
  });

  // If a real DB booking was referenced, update or create Payment record in DB
  let paymentDoc = null;
  if (booking) {
    paymentDoc = await Payment.findOne({
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
        customerId: booking.customerId,
        companyId: booking.companyId,
        amount: check.value,
        paymentMethod: "MOAMALAT",
        paymentGateway: "MOAMALAT",
        status: "PENDING",
        merchantReference,
      });
      await paymentDoc.save();
    }
  }

  // Response matches both the manager's openLightBox(params) expectations:
  // params.MID, params.TID, params.AmountTrxn, params.MerchantReference, params.TrxDateTime, params.SecureHash
  // AND the NexRide data wrapper!
  res.status(200).json({
    status: "success",
    MID: moamalatConfig.merchantId,
    TID: moamalatConfig.terminalId,
    AmountTrxn: String(amountTrxn),
    MerchantReference: merchantReference,
    TrxDateTime: trxDateTime,
    SecureHash: secureHash,
    data: {
      payment: {
        id: paymentDoc ? paymentDoc._id : merchantReference,
        bookingId: booking ? booking._id : null,
        amount: check.value,
        merchantReference,
      },
      gateway: {
        lightBoxUrl: moamalatConfig.lightBoxUrl,
        env: moamalatConfig.env,
        params: {
          MID: moamalatConfig.merchantId,
          TID: moamalatConfig.terminalId,
          AmountTrxn: String(amountTrxn),
          MerchantReference: merchantReference,
          TrxDateTime: trxDateTime,
          SecureHash: secureHash,
        },
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

  // Lookup in memory and in MongoDB
  const pendingPayment = pendingPayments.get(String(merchantReference));
  let paymentDoc = await Payment.findOne({
    merchantReference: String(merchantReference),
  }).catch(() => null);

  console.log("SERVER STORED PAYMENT:", pendingPayment || paymentDoc);

  if (!pendingPayment && !paymentDoc) {
    return res.status(404).json({
      verified: false,
      reason: "Original payment record was not found.",
      message: "Original payment record was not found.",
    });
  }

  // Already finalized check (idempotency)
  if (
    (pendingPayment && pendingPayment.verified) ||
    (paymentDoc && paymentDoc.status === "COMPLETED")
  ) {
    return res.status(200).json({
      verified: true,
      merchantReference,
      systemReference:
        paymentDoc?.transactionId ||
        pendingPayment?.systemReference ||
        systemReference ||
        "",
      networkReference: pendingPayment?.networkReference || "",
      amount: paymentDoc?.amount || pendingPayment?.amountLyd || 0,
      status: "APPROVED",
      alreadyProcessed: true,
      data: {
        verified: true,
        merchantReference,
        systemReference:
          paymentDoc?.transactionId ||
          pendingPayment?.systemReference ||
          systemReference ||
          "",
        networkReference: pendingPayment?.networkReference || "",
        amount: paymentDoc?.amount || pendingPayment?.amountLyd || 0,
        status: "APPROVED",
        alreadyProcessed: true,
      },
    });
  }

  const expectedAmount = pendingPayment
    ? pendingPayment.amountLyd ?? (Number(pendingPayment.amountTrxn) / 1000)
    : paymentDoc?.amount;

  const result = await verifyTransaction({
    merchantReference: String(merchantReference),
    expectedAmount,
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

  // Update in-memory state
  if (pendingPayment) {
    pendingPayment.verified = true;
    pendingPayment.verifiedAt = Date.now();
    pendingPayment.systemReference =
      result.systemReference || String(systemReference || "");
    pendingPayment.networkReference = result.networkReference || "";
    pendingPayments.set(String(merchantReference), pendingPayment);
  }

  // If a database booking is linked to this payment, finalize in DB
  let updatedBooking = null;
  const targetBookingId =
    paymentDoc?.bookingId || pendingPayment?.bookingId;

  if (targetBookingId) {
    try {
      await finalizeVerifiedPayment({
        bookingId: targetBookingId,
        paymentId: paymentDoc?._id,
        systemReference: result.systemReference || systemReference,
        networkReference: result.networkReference,
      });

      updatedBooking = await Booking.findById(targetBookingId).select(
        "bookingStatus paymentStatus vehicleId",
      );
    } catch (err) {
      console.error("Error finalizing DB booking on payment verification:", err);
    }
  }

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