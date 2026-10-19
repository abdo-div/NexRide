import crypto from "node:crypto";
import https from "node:https";
import mongoose from "mongoose";
import Payment from "../models/payment_model.js";
import Booking from "../models/booking_model.js";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";
import { isDevelopment } from "../config/env.js";
import {
  moamalatConfig,
  isMoamalatConfigured,
} from "../config/moamalat.js";
import { releaseVehicleHold } from "./reservationHold.service.js";
import { addEmailToQueue } from "../queues/emailQueue.js";

const postJsonOverIpv4 = (url, body, timeoutMs = 15000) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = https.request(
      url,
      {
        method: "POST",
        family: 4,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: timeoutMs,
      },
      (response) => {
        response.setEncoding("utf8");
        let text = "";
        response.on("data", (chunk) => { text += chunk; });
        response.on("end", () => resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          text: async () => text,
        }));
      },
    );
    request.on("timeout", () => request.destroy(new Error("Moamalat request timed out")));
    request.on("error", reject);
    request.end(payload);
  });

// -----------------------------------------------------------------------------
// Formatting helpers (Moamalat field formats)
// -----------------------------------------------------------------------------

/** Date parts in Moamalat's business timezone, used by date-only API filters. */
const moamalatDateParts = (date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: moamalatConfig.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
};

/**
 * 1 LYD = 1000 Moamalat units. AmountTrxn must be the truncated integer of
 * (amountLyd * 1000), mirroring the gateway's smallest-unit convention.
 */
export const amountToUnits = (amountLyd) => Math.round(amountLyd * 1000);

/**
 * Moamalat's shared test merchant only approves its published cards for a
 * fixed 10 LYD transaction. Live merchants must always charge the booking's
 * full amount.
 */
export const gatewayAmountForBooking = (bookingAmount) =>
  moamalatConfig.env === "test"
    ? moamalatConfig.testAmount
    : Number(bookingAmount);

/** YYYYMMDDHHmm — required by the LightBox script used by this project. */
export const formatTrxDateTime = (date = new Date()) => {
  const parts = moamalatDateParts(date);
  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}`;
};

/** YYMMDDHHmmss — required by the FilterTransactions API. */
export const formatVerificationDateTime = (date = new Date()) => {
  const parts = moamalatDateParts(date);
  return (
    `${parts.year.slice(-2)}${parts.month}${parts.day}` +
    `${parts.hour}${parts.minute}${parts.second}`
  );
};

/** YYYYMMDD — FilterTransactions DateFrom/DateTo window. */
export const formatDateParam = (date = new Date()) => {
  const parts = moamalatDateParts(date);
  return `${parts.year}${parts.month}${parts.day}`;
};

/**
 * Unique reference for a payment attempt, tied to the booking so the verify
 * step can always recover the owning booking. Kept well under the 40-char
 * gateway limit.
 */
export const generateMerchantReference = (bookingId) => {
  const bookingTag = String(bookingId).replace(/\W/g, "").slice(-10);
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(16).slice(2, 6);
  return `NX-${bookingTag}-${ts}-${rand}`;
};

// -----------------------------------------------------------------------------
// Secure hash signing (HMAC-SHA256 with the hex-encoded secure key)
// -----------------------------------------------------------------------------

const hmacDigest = (data) =>
  crypto
    .createHmac("sha256", Buffer.from(moamalatConfig.secureKey, "hex"))
    .update(data)
    .digest("hex");

/**
 * Checkout hash (UPPERCASE) over the amount + transaction window + merchant
 * identity. Sent to the LightBox inside the configure object.
 */
export const generateSecureHash = ({
  amount,
  trxDateTime,
  merchantId,
  merchantReference,
  terminalId,
}) =>
  hmacDigest(
    canonicalCheckoutString({
      amount,
      trxDateTime,
      merchantId,
      merchantReference,
      terminalId,
    }),
  ).toUpperCase();

/**
 * Verification hash (lowercase) over the transaction window + merchant
 * identity. Sent to FilterTransactions to authenticate the query.
 */
export const generateVerificationHash = ({
  trxDateTime,
  merchantId,
  terminalId,
}) =>
  hmacDigest(
    `DateTimeLocalTrxn=${trxDateTime}&MerchantId=${merchantId}&TerminalId=${terminalId}`,
  );

const HEX_RE = /^[0-9a-f]+$/i;

const equalsHex = (expectedHex, providedHex) => {
  if (typeof expectedHex !== "string" || typeof providedHex !== "string") {
    return false;
  }
  if (!HEX_RE.test(expectedHex) || !HEX_RE.test(providedHex)) {
    return false;
  }
  const expected = Buffer.from(expectedHex, "hex");
  const provided = Buffer.from(providedHex, "hex");
  if (expected.length !== provided.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, provided);
};

const canonicalCheckoutString = ({
  amount,
  trxDateTime,
  merchantId,
  merchantReference,
  terminalId,
}) =>
  `Amount=${amount}&DateTimeLocalTrxn=${trxDateTime}&MerchantId=${merchantId}` +
  `&MerchantReference=${merchantReference}&TerminalId=${terminalId}`;

/**
 * Verifies a Moamalat-side signature (SecureHash / SecuredHash) against the
 * canonical amount + transaction window message, discriminator-free. The
 * comparison is constant-time over the hex digests so an attacker cannot learn
 * the signature byte by byte, and any malformed/absent input is rejected.
 *
 * The gateway hashes the checkout fields, so the parties agreeing on this
 * string are the frontend configure object and any signature echoed back on a
 * verified transaction - both must match identically.
 */
export const verifySecureHashSignature = ({
  signature,
  amount,
  trxDateTime,
  merchantId,
  merchantReference,
  terminalId,
}) => {
  if (
    typeof signature !== "string" ||
    signature.length === 0 ||
    amount == null ||
    typeof trxDateTime !== "string" ||
    trxDateTime.length === 0
  ) {
    return false;
  }
  const expected = hmacDigest(
    canonicalCheckoutString({
      amount,
      trxDateTime,
      merchantId,
      merchantReference,
      terminalId,
    }),
  ).toUpperCase();
  // The gateway echoes UPPERCASE digests, but a sandbox may send lowercase.
  return equalsHex(expected, String(signature).toUpperCase());
};

// -----------------------------------------------------------------------------
// Checkout orchestration
// -----------------------------------------------------------------------------

/**
 * Builds the exact object the Moamalat LightBox configure expects, signing the
 * booking amount so the frontend can never tamper with what is charged.
 */
export const buildCheckoutParams = (booking, merchantReference) => {
  const trxDateTime = formatTrxDateTime();
  const amount = amountToUnits(gatewayAmountForBooking(booking.totalAmount));

  return {
    MID: moamalatConfig.merchantId,
    TID: moamalatConfig.terminalId,
    AmountTrxn: String(amount),
    MerchantReference: merchantReference,
    TrxDateTime: trxDateTime,
    SecureHash: generateSecureHash({
      amount,
      trxDateTime,
      merchantId: moamalatConfig.merchantId,
      merchantReference,
      terminalId: moamalatConfig.terminalId,
    }),
  };
};

// -----------------------------------------------------------------------------
// Gateway diagnostics (development only)
//
// These helpers reproduce what the hosted checkout page sends to the gateway so
// the diagnostic endpoint can show the raw round-trip (order creation and,
// optionally, the card-payment step) without a browser. They must never run in
// production: the controller gates them behind isDevelopment() + test env.
// -----------------------------------------------------------------------------

const postToGateway = async (url, body, token) => {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let gateway = null;
    try {
      gateway = JSON.parse(text);
    } catch {
      gateway = null;
    }
    return {
      httpStatus: response.status,
      gateway,
      raw: gateway ? undefined : text.slice(0, 800),
      error: null,
    };
  } catch (err) {
    return { httpStatus: null, gateway: null, raw: undefined, error: err.message };
  }
};

/**
 * Creates a Moamalat order exactly the way the hosted LightBox page does
 * (POST {lightBoxApi}/LightboxHostedCheckout) so the diagnose endpoint can show
 * the raw gateway response. Never charges anything.
 */
export const probeCheckoutOrder = async ({ amount, merchantReference }) => {
  const units = amountToUnits(amount);
  const trxDateTime = formatTrxDateTime();
  const request = {
    OrderID: "",
    MID: moamalatConfig.merchantId,
    TID: moamalatConfig.terminalId,
    Amount: amount,
    Referrer: "",
    PaymentMethodFromLightBox: 2,
    MerchantReference: merchantReference,
    SecureHashAnonymous: generateSecureHash({
      amount: units,
      trxDateTime,
      merchantId: moamalatConfig.merchantId,
      merchantReference,
      terminalId: moamalatConfig.terminalId,
    }),
    TrxDateTime: trxDateTime,
    feeAmount: 0,
    AdditionalCustomerDataReq: {},
  };

  const result = await postToGateway(
    `${moamalatConfig.lightBoxApiUrl}LightboxHostedCheckout`,
    request,
  );
  return { request, ...result };
};

/**
 * Mirrors the hosted page's card submission (POST {lightBoxApi}/PayByCard with
 * the order token). Only used by the dev-only diagnose endpoint with the
 * published sandbox test card; it must never run against production.
 */
export const probePayByCard = async ({ order, token, card }) => {
  if (!order || !token) {
    return {
      attempted: false,
      reason: "No order/token available to probe the card step.",
    };
  }

  const request = {
    CardPaymentModel: {
      amount: order.amount,
      currency: order.currency,
      orderID: order.orderID,
      terminalId: order.terminalID,
      merchantId: order.merchantID,
      merchantName: order.merchantName,
      merchantReference: order.merchantReferenceNumber,
      cardNumber: card.number,
      expiration: card.expiration,
      nameOnCard: card.nameOnCard,
      cVV: card.cvv,
      isSaveCard: false,
      isTokenized: false,
      deviceFingerPrint: JSON.stringify({ diagnostic: true }),
      ReturnURL: "",
      additionalCustomerData: JSON.stringify({}),
    },
    token,
    amount: order.amount,
    customerPaymentOrderFields: [],
  };

  const result = await postToGateway(
    `${moamalatConfig.lightBoxApiUrl}PayByCard`,
    request,
    token,
  );
  return { attempted: true, ...result };
};

/**
 * Builds a compact, secret-free summary of a gateway order response.
 */
export const summariseGatewayOrder = (gateway) => {
  const order = gateway?.orderDetailsModel;
  if (!order) return null;
  return {
    merchantName: order.merchantName ?? null,
    amount: order.amount ?? null,
    currency: order.currency ?? null,
    terminalId: order.terminalID ?? order.terminalId ?? null,
    merchantId: order.merchantID ?? order.merchantId ?? null,
    orderID: order.orderID ?? null,
    isCyberSource: order.isCyberSource ?? null,
    isNPG: order.isNPG ?? null,
  };
};

/**
 * Confirms a payment against Moamalat's FilterTransactions endpoint. The
 * authoritative source of truth is the gateway response, never the LightBox
 * callback. Returns a normalised result the controller can hand to the client.
 */
export const verifyTransaction = async ({
  merchantReference,
  expectedAmount,
  systemReference,
} = {}) => {
  if (!isMoamalatConfigured()) {
    throw new AppError(
      "Moamalat payment gateway is not configured. Add the MOAMALAT_* environment variables.",
      500,
    );
  }

  const now = new Date();
  const dateTimeLocalTrxn = formatVerificationDateTime(now);
  const dateToday = formatDateParam(now);

  const secureHash = generateVerificationHash({
    trxDateTime: dateTimeLocalTrxn,
    merchantId: moamalatConfig.merchantId,
    terminalId: moamalatConfig.terminalId,
  });

  const requestBody = {
    SecureHash: secureHash,
    DateTimeLocalTrxn: dateTimeLocalTrxn,
    TerminalId: moamalatConfig.terminalId,
    MerchantId: moamalatConfig.merchantId,
    DateFrom: dateToday,
    DateTo: dateToday,
    MerchantReference: String(merchantReference),
    FetchType: "0",
    DisplayStart: "0",
    DisplayLength: "1",
  };

  let response;
  let responseText = "";
  let gateway = null;

  try {
    try {
      response = await fetch(moamalatConfig.verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
    } catch (fetchError) {
      logger.warn({
        channel: "moamalat",
        event: "moamalat_fetch_ipv4_fallback",
        causeCode: fetchError?.cause?.code ?? null,
      }, "Retrying Moamalat verification over the IPv4 HTTPS transport");
      response = await postJsonOverIpv4(moamalatConfig.verifyUrl, requestBody);
    }
    responseText = await response.text();
    try {
      gateway = JSON.parse(responseText);
    } catch {
      gateway = null;
    }
  } catch (err) {
    const cause = err?.cause;
    logger.error({
      channel: "moamalat",
      event: "moamalat_verification_transport_failed",
      error: err?.message ?? "Unknown transport error",
      causeCode: cause?.code ?? null,
      causeMessage: cause?.message ?? null,
      address: cause?.address ?? null,
      family: cause?.family ?? null,
    });
    throw new AppError(
      `Moamalat verification request failed: ${err.message}`,
      502,
    );
  }

  if (!response?.ok || !gateway) {
    logger.error({
      channel: "moamalat",
      ok: Boolean(response),
      status: response?.status ?? null,
      reason: "Moamalat verification request failed",
    });
    return {
      verified: false,
      reason: "Moamalat verification request failed.",
      status: "GATEWAY_ERROR",
      merchantReference,
    };
  }

  let matchedTransaction = null;

  // Manager reference implementation: walk Transactions array -> DateTransactions.
  // Tolerant of a naked object envelope (no array wrapper) and missing keys.
  const collectRows = (node, rows = []) => {
    if (!node || typeof node !== "object") return rows;
    if (Array.isArray(node)) {
      node.forEach((entry) => collectRows(entry, rows));
      return rows;
    }
    if (node.MerchantReference) {
      rows.push(node);
      return rows;
    }
    ["Transactions", "DateTransactions"].forEach((key) => {
      if (node[key]) collectRows(node[key], rows);
    });
    return rows;
  };
  const rows = collectRows(gateway, []);
  matchedTransaction = rows.find(
    (row) => String(row.MerchantReference) === String(merchantReference),
  );

  if (!matchedTransaction) {
    return {
      verified: false,
      reason: "Transaction was not found.",
      status: "NOT_FOUND",
      merchantReference,
      systemReference: "",
      networkReference: "",
      amount: 0,
    };
  }

  // When the matched transaction echoes a signature, rely on it: a payment
  // whose SecureHash/SecuredHash does not match our canonical payload is not
  // verified. Sandboxes that do not echo a signature (or omit the transaction
  // date time it is signed over) cannot be reconstructed, so they are refused
  // as unverifiable rather than trusted by absence.
  const txnSignature =
    matchedTransaction.SecureHash ??
    matchedTransaction.SecuredHash ??
    matchedTransaction.secureHash ??
    null;
  if (txnSignature) {
    const txnDateTime =
      typeof matchedTransaction.DateTimeLocalTrxn === "string" &&
      /^\d{10,14}$/.test(matchedTransaction.DateTimeLocalTrxn)
        ? matchedTransaction.DateTimeLocalTrxn.slice(0, 12)
        : null;
    const signatureValid =
      txnDateTime != null &&
      verifySecureHashSignature({
        signature: txnSignature,
        amount: matchedTransaction.AmountTrxn,
        trxDateTime: txnDateTime,
        merchantId: moamalatConfig.merchantId,
        merchantReference: String(merchantReference),
        terminalId: moamalatConfig.terminalId,
      });

    if (!signatureValid) {
      return {
        verified: false,
        reason: "Transaction signature could not be validated.",
        status: "SIGNATURE_MISMATCH",
        merchantReference,
        systemReference: matchedTransaction.TransactionId
          ? String(matchedTransaction.TransactionId)
          : "",
        networkReference: matchedTransaction.RRN || "",
        amount: Number(matchedTransaction.AmountTrxn ?? 0),
      };
    }
  }

  if (isDevelopment()) {
    logger.info(
      {
        channel: "moamalat",
        reference: String(merchantReference),
        matched: true,
        signaturePresent: Boolean(txnSignature),
        signatureValid: true,
      },
      "Moamalat verification matched a transaction",
    );
  }

  const gatewayAmount = Number(matchedTransaction.AmountTrxn);
  const referenceMatches =
    String(matchedTransaction.MerchantReference) === String(merchantReference);

  const expectedAmountUnits =
    expectedAmount != null
      ? amountToUnits(Number(expectedAmount))
      : gatewayAmount;

  const amountMatches =
    Number.isFinite(gatewayAmount) &&
    Math.round(gatewayAmount) === Math.round(expectedAmountUnits);

  const statusApproved =
    String(matchedTransaction.Status || "").toLowerCase() === "approved";

  const gatewaySystemReference =
    matchedTransaction.TransactionId != null
      ? String(matchedTransaction.TransactionId)
      : null;

  const systemReferenceMatches =
    !systemReference ||
    (gatewaySystemReference &&
      String(systemReference) === gatewaySystemReference);

  if (
    !referenceMatches ||
    !amountMatches ||
    !statusApproved ||
    !systemReferenceMatches
  ) {
    return {
      verified: false,
      reason: "Transaction details did not match.",
      status: matchedTransaction.Status || null,
      gatewayAmount: matchedTransaction.AmountTrxn || null,
      merchantReference,
      systemReference: gatewaySystemReference || String(systemReference || ""),
      networkReference: matchedTransaction.RRN || "",
      amount: Number(matchedTransaction.AmountTrxn ?? 0),
    };
  }

  return {
    verified: true,
    merchantReference: matchedTransaction.MerchantReference,
    systemReference: gatewaySystemReference || String(systemReference || ""),
    networkReference: matchedTransaction.RRN || "",
    amount: Number(matchedTransaction.AmountTrxn ?? 0),
    status: matchedTransaction.Status || "Approved",
  };
};

/**
 * Marks a booking + its payment ledger record paid inside one Mongoose ACID
 * transaction and makes the vehicle unavailable. Idempotent: re-verifying an
 * already-completed payment is a no-op success.
 */
export const finalizeVerifiedPayment = async ({
  bookingId,
  paymentId,
  systemReference,
  networkReference,
}) => {
  const session = await mongoose.startSession();
  let payment;
  let booking;
  let alreadyPaid = false;

  try {
    await session.withTransaction(async () => {
      payment = await Payment.findById(paymentId).session(session);
      booking = await Booking.findById(bookingId).session(session);

      if (!payment) {
        throw new AppError("No payment record found for that booking", 404);
      }
      if (!booking) {
        throw new AppError("No booking found with that ID", 404);
      }

      const paymentBookingId = payment.bookingId?._id ?? payment.bookingId;
      if (paymentBookingId?.toString() !== booking._id.toString()) {
        throw new AppError("Payment does not belong to the expected booking.", 409);
      }

      if (
        payment.paymentGateway !== "MOAMALAT" ||
        payment.paymentMethod !== "MOAMALAT"
      ) {
        throw new AppError("Payment was not initialized for Moamalat.", 409);
      }

      if (
        amountToUnits(Number(payment.amount)) !==
        amountToUnits(Number(booking.totalAmount))
      ) {
        throw new AppError("Payment amount does not match the booking amount.", 409);
      }

      alreadyPaid =
        payment.status === "COMPLETED" &&
        booking.bookingStatus === "PAID" &&
        booking.paymentStatus === "PAID";
      if (alreadyPaid) return;

      if (
        payment.status !== "PENDING" ||
        booking.bookingStatus !== "PENDING_PAYMENT" ||
        booking.paymentStatus !== "UNPAID"
      ) {
        throw new AppError("Payment or booking is not eligible for finalization.", 409);
      }

      booking.bookingStatus = "PAID";
      booking.paymentStatus = "PAID";
      await booking.save({ session, validateBeforeSave: false });

      payment.status = "COMPLETED";
      payment.transactionId = systemReference || payment.transactionId;
      payment.paidAt = new Date();
      await payment.save({ session });
    });
  } finally {
    await session.endSession();
  }

  if (!alreadyPaid) {
    // Redis and email are post-commit conveniences. Their failure must never
    // turn a completed card payment into a failed checkout response.
    await releaseVehicleHold(booking.vehicleId).catch(() => {});

    const customer = booking.customerId;
    const vehicle = booking.vehicleId;
    if (customer?.email) {
      await addEmailToQueue("BOOKING_CONFIRMATION", {
        email: customer.email,
        bookingId: booking._id.toString(),
        vehicleName: vehicle
          ? `${vehicle.make} ${vehicle.model}`
          : "Your vehicle",
      }).catch(() => {});
    }
  }

  return payment;
};
