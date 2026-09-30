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
} = {}) => {
  if (!isMoamalatConfigured()) {
    throw new AppError(
      "Moamalat payment gateway is not configured. Add the MOAMALAT_* environment variables.",
      500,
    );
  }

  const now = new Date();
  const trxDateTime = formatVerificationDateTime(now);

  const body = {
    SecureHash: generateVerificationHash({
      trxDateTime,
      merchantId: moamalatConfig.merchantId,
      terminalId: moamalatConfig.terminalId,
    }),
    DateTimeLocalTrxn: trxDateTime,
    TerminalId: moamalatConfig.terminalId,
    MerchantId: moamalatConfig.merchantId,
    DateFrom: formatDateParam(now),
    DateTo: formatDateParam(now),
    MerchantReference: merchantReference,
    FetchType: "0",
    DisplayStart: "0",
    DisplayLength: "1",
  };

  let gateway;
  try {
    const response = await fetch(moamalatConfig.verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    gateway = await response.json();
  } catch (err) {
    throw new AppError(
      `Moamalat verification request failed: ${err.message}`,
      502,
    );
  }

  const transactionsResponse = gateway?.Transactions;
  if (!transactionsResponse || transactionsResponse.Status !== "Success") {
    throw new AppError(
      "Moamalat gateway could not confirm the transaction.",
      502,
    );
  }

  // Moamalat nests transaction rows under DateTransactions, sometimes as a
  // flat list, sometimes grouped under a Transactions node per date. Walk the
  // tree and collect every row that carries a MerchantReference.
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

  const transaction = collectRows(transactionsResponse, []).find(
    (row) => row.MerchantReference === merchantReference,
  );

  if (!transaction) {
    return {
      verified: false,
      merchantReference,
      systemReference: "",
      networkReference: "",
      amount: 0,
      status: "NOT_FOUND",
    };
  }

  const referenceMatches = transaction.MerchantReference === merchantReference;
  const amountMatches =
    Math.round(Number(transaction.AmountTrxn ?? 0)) ===
    Math.round(amountToUnits(expectedAmount ?? 0));
  const approved = String(transaction.Status ?? "").toLowerCase() === "approved";

  return {
    verified: referenceMatches && amountMatches && approved,
    merchantReference,
    systemReference: transaction.TransactionId ?? "",
    networkReference: transaction.RRN ?? "",
    amount: Number(transaction.AmountTrxn ?? 0),
    status: transaction.Status ?? "UNKNOWN",
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

    const alreadyPaid =
      payment.status === "COMPLETED" && booking.paymentStatus === "PAID";
    if (alreadyPaid) {
      await session.commitTransaction();
      session.endSession();
      return payment;
    }

    booking.bookingStatus = "PAID";
    booking.paymentStatus = "PAID";
    await booking.save({ session, validateBeforeSave: false });

    payment.status = "COMPLETED";
    payment.transactionId = systemReference || payment.transactionId;
    payment.paidAt = new Date();
    await payment.save({ session });

    // Booking overlap checks + fleet search already exclude PAID/CONFIRMED/
    // ACTIVE records; flipping operationalStatus mirrors the existing
    // cash/Stripe completion path and satisfies "car no longer available".
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