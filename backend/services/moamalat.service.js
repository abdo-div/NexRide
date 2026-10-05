import crypto from "node:crypto";
import mongoose from "mongoose";
import Payment from "../models/payment_model.js";
import Booking from "../models/booking_model.js";
import Vehicle from "../models/vehicle_model.js";
import AppError from "../utils/appError.js";
import {
  moamalatConfig,
  isMoamalatConfigured,
} from "../config/moamalat.js";
import { releaseVehicleHold } from "./reservationHold.service.js";
import { addEmailToQueue } from "../queues/emailQueue.js";

// -----------------------------------------------------------------------------
// Formatting helpers (Moamalat field formats)
// -----------------------------------------------------------------------------

const pad2 = (value) => String(value).padStart(2, "0");

/**
 * 1 LYD = 1000 Moamalat units. AmountTrxn must be the truncated integer of
 * (amountLyd * 1000), mirroring the gateway's smallest-unit convention.
 */
export const amountToUnits = (amountLyd) => Math.round(amountLyd * 1000);

/** YYYYMMDDHHmm — used in the checkout SecureHash string. */
export const formatTrxDateTime = (date = new Date()) =>
  `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}${pad2(
    date.getHours(),
  )}${pad2(date.getMinutes())}`;

/** YYMMDDHHmmss — used in the verification SecureHash string + API body. */
export const formatVerificationDateTime = (date = new Date()) =>
  `${pad2(date.getFullYear() % 100)}${pad2(date.getMonth() + 1)}${pad2(
    date.getDate(),
  )}${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;

/** YYYYMMDD — FilterTransactions DateFrom/DateTo window. */
export const formatDateParam = (date = new Date()) =>
  `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;

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
    `Amount=${amount}&DateTimeLocalTrxn=${trxDateTime}&MerchantId=${merchantId}` +
      `&MerchantReference=${merchantReference}&TerminalId=${terminalId}`,
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

// -----------------------------------------------------------------------------
// Checkout orchestration
// -----------------------------------------------------------------------------

/**
 * Builds the exact object the Moamalat LightBox configure expects, signing the
 * booking amount so the frontend can never tamper with what is charged.
 */
export const buildCheckoutParams = (booking, merchantReference) => {
  const trxDateTime = formatTrxDateTime();
  const amount = amountToUnits(booking.totalAmount);

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
    response = await fetch(moamalatConfig.verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    responseText = await response.text();
    try {
      gateway = JSON.parse(responseText);
    } catch {
      gateway = null;
    }
  } catch (err) {
    throw new AppError(
      `Moamalat verification request failed: ${err.message}`,
      502,
    );
  }

  if (!response?.ok || !gateway) {
    console.error(
      "Moamalat verification request failed:",
      response?.status,
      responseText,
    );
    return {
      verified: false,
      reason: "Moamalat verification request failed.",
      status: "GATEWAY_ERROR",
      merchantReference,
    };
  }

  console.log("Moamalat verification response:", JSON.stringify(gateway, null, 2));

  let matchedTransaction = null;

  // Manager reference implementation: walk Transactions array -> DateTransactions
  if (Array.isArray(gateway.Transactions)) {
    for (const group of gateway.Transactions) {
      if (!group || !Array.isArray(group.DateTransactions)) {
        continue;
      }
      for (const txn of group.DateTransactions) {
        if (
          txn &&
          String(txn.MerchantReference) === String(merchantReference)
        ) {
          matchedTransaction = txn;
          break;
        }
      }
      if (matchedTransaction) break;
    }
  }

  // Fallback tree walk if nested under a different root
  if (!matchedTransaction) {
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

    matchedTransaction = collectRows(gateway, []).find(
      (row) => String(row.MerchantReference) === String(merchantReference),
    );
  }

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
  session.startTransaction();

  try {
    const payment = await Payment.findById(paymentId).session(session);
    const booking = await Booking.findById(bookingId).session(session);

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

    if (amountToUnits(Number(payment.amount)) !== amountToUnits(Number(booking.totalAmount))) {
      throw new AppError("Payment amount does not match the booking amount.", 409);
    }

    const alreadyPaid =
      payment.status === "COMPLETED" &&
      booking.bookingStatus === "PAID" &&
      booking.paymentStatus === "PAID";
    if (alreadyPaid) {
      await session.commitTransaction();
      session.endSession();
      return payment;
    }

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

    // Booking overlap checks + fleet search already include PAID/CONFIRMED/
    // ACTIVE records; flipping operationalStatus mirrors the existing
    // cash completion path and satisfies "car no longer available".
    await Vehicle.findByIdAndUpdate(
      booking.vehicleId,
      { operationalStatus: "UNAVAILABLE" },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    // Checkout concluded — free the vehicle reservation hold.
    await releaseVehicleHold(booking.vehicleId);

    const customer = booking.customerId;
    const vehicle = booking.vehicleId;
    if (customer?.email) {
      await addEmailToQueue("BOOKING_CONFIRMATION", {
        email: customer.email,
        bookingId: booking._id.toString(),
        vehicleName: vehicle ? `${vehicle.make} ${vehicle.model}` : "Your vehicle",
      });
    }

    return payment;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};