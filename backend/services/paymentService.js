import mongoose from "mongoose";
import Payment from "../models/payment_model.js";
import Booking from "../models/booking_model.js";
import Company from "../models/Company_model.js";
import User from "../models/User_model.js";
import AppError from "../utils/appError.js";
import { runPaginatedQuery } from "../utils/paginatedQuery.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildPaymentSearchFilter = async (search) => {
  const term = typeof search === "string" ? search.trim() : "";
  if (!term) return null;

  const regex = new RegExp(escapeRegex(term), "i");
  const [customerIds, companyIds, bookingRows] = await Promise.all([
    User.distinct("_id", {
      $or: [
        { name: regex },
        { email: regex },
        { phoneNumber: regex },
      ],
    }),
    Company.distinct("_id", { name: regex }),
    Booking.aggregate([
      {
        $addFields: {
          searchReference: {
            $concat: [
              "NX-",
              {
                $toUpper: {
                  $substrCP: [{ $toString: "$_id" }, 18, 6],
                },
              },
            ],
          },
        },
      },
      { $match: { searchReference: regex } },
      { $project: { _id: 1 } },
    ]),
  ]);

  return {
    $or: [
      { merchantReference: regex },
      { transactionId: regex },
      { paymentMethod: regex },
      { status: regex },
      { customerId: { $in: customerIds } },
      { companyId: { $in: companyIds } },
      { bookingId: { $in: bookingRows.map((row) => row._id) } },
      {
        $expr: {
          $regexMatch: {
            input: {
              $concat: [
                "#TRX-",
                {
                  $toUpper: {
                    $substrCP: [{ $toString: "$_id" }, 18, 6],
                  },
                },
              ],
            },
            regex: regex.source,
            options: "i",
          },
        },
      },
    ],
  };
};

const paymentRangeFilter = (range) => {
  const days = { today: 1, "7d": 7, "30d": 30 }[range];
  if (!days) return null;

  const from = new Date(Date.now() - days * 86400000);
  return {
    $or: [
      { paidAt: { $gte: from } },
      { paidAt: null, createdAt: { $gte: from } },
    ],
  };
};

const combineFilters = (...filters) => {
  const active = filters.filter(
    (filter) => filter && Object.keys(filter).length > 0,
  );
  if (active.length === 0) return {};
  if (active.length === 1) return active[0];
  return { $and: active };
};

/**
 * Execute payment intent inside a Mongoose ACID Transaction
 */
export const executePaymentProcessing = async (paymentData, customerId) => {
  const { bookingId } = paymentData;
  const paymentMethod = paymentData.paymentMethod || "CASH_ON_DELIVERY";

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) {
      throw new AppError("No booking found with that ID", 404);
    }

    const bookingCustomerId = booking.customerId?._id ?? booking.customerId;
    if (!bookingCustomerId || bookingCustomerId.toString() !== customerId.toString()) {
      throw new AppError("You can only process payment for your own booking.", 403);
    }

    if (
      booking.bookingStatus !== "PENDING_PAYMENT" ||
      booking.paymentStatus !== "UNPAID"
    ) {
      throw new AppError(
        "This booking is not eligible for payment.",
        409,
      );
    }

    const completedPayment = await Payment.findOne({
      bookingId: booking._id,
      status: "COMPLETED",
    }).session(session);
    if (completedPayment) {
      throw new AppError("This booking has already been paid.", 409);
    }

    const payment = await Payment.create(
      [
        {
          bookingId: booking._id,
          customerId: bookingCustomerId,
          companyId: booking.companyId?._id ?? booking.companyId,
          amount: booking.totalAmount,
          paymentMethod,
          status: "PENDING",
          payoutStatus: "UNSETTLED",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return payment[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Fetch a single payment record by ID
 */
export const fetchPaymentById = async (paymentId) => {
  const payment = await Payment.findById(paymentId)
    .populate("customerId", "name email")
    .populate("bookingId")
    .populate("companyId", "name");

  if (!payment) {
    throw new AppError("No payment record found with that ID", 404);
  }

  return payment;
};
const resolveId = (value) => {
  if (!value) return null;
  if (value._id) return value._id.toString();
  return value.toString();
};

/**
 * Guard for the invoice PDF, which embeds customer name, email and phone number.
 *
 * The invoice route streams PII for whoever owns the payment, so access must be
 * proven at the point the data would be released rather than relying on a bare
 * findById. Admins may read any invoice; otherwise the caller must be the paying
 * customer or the company the payment belongs to.
 *
 * Throws 403 rather than 404 so a missing relationship is never reported as
 * "not found", which would let callers probe for the existence of other
 * tenants' payments.
 */
export const assertInvoiceAccess = (payment, user, tenantId = null) => {
  if (!payment) {
    throw new AppError("No payment record found with that ID", 404);
  }

  if (!user) {
    throw new AppError("You are not logged in! Please log in to get access.", 401);
  }

  if (user.role === "admin") return payment;

  const callerId = (user.id ?? user._id)?.toString();
  const customerId = resolveId(payment.customerId);
  const companyId = resolveId(payment.companyId);

  if (customerId && callerId && customerId === callerId) return payment;

  const callerTenantId = (tenantId ?? user.company)?.toString();
  if (companyId && callerTenantId && companyId === callerTenantId) return payment;

  throw new AppError(
    "Access Denied. You are not permitted to view this invoice.",
    403,
  );
};

/**
 * Fetch all payments with filtering for Tenants/Admins
 *
 * Returns the requested page plus pagination metadata. The total is counted
 * against the identical filter, so a company or admin can page through its whole
 * ledger instead of silently stopping at the per-page cap.
 */
export const fetchAllPayments = async (queryParams, user, tenantId = null) => {
  const callerTenantId = tenantId ?? user.company;
  if (user.role === "company" && !callerTenantId) {
    throw new AppError(
      "No company tenant is linked to this user account.",
      403,
    );
  }

  const filter = combineFilters(
    user.role === "company" ? { companyId: callerTenantId } : null,
    paymentRangeFilter(queryParams.range),
    await buildPaymentSearchFilter(queryParams.search),
  );

  const { docs, pagination } = await runPaginatedQuery(
    Payment,
    filter,
    queryParams,
    {
      excludeFields: ["range", "search"],
      populate:
        user.role === "admin"
          ? [
              { path: "customerId", select: "name email phoneNumber photo" },
              {
                path: "companyId",
                select: "name city status customCommissionRate",
              },
              {
                path: "bookingId",
                populate: { path: "vehicleId", select: "make model year" },
              },
            ]
          : undefined,
    },
  );

  return { payments: docs, pagination };
};

/**
 * Calculate company payout summary & platform splits
 */
export const calculateCompanyPayoutSummary = async (companyId) => {
  const matchQuery = companyId
    ? { companyId: new mongoose.Types.ObjectId(companyId) }
    : {};

  const stats = await Payment.aggregate([
    { $match: { ...matchQuery, status: "COMPLETED" } },
    {
      $group: {
        _id: "$payoutStatus",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  let totalRevenue = 0;
  let pendingPayouts = 0;
  let settledPayouts = 0;

  stats.forEach((stat) => {
    totalRevenue += stat.totalAmount;
    if (stat._id === "UNSETTLED") pendingPayouts = stat.totalAmount;
    if (stat._id === "SETTLED") settledPayouts = stat.totalAmount;
  });

  return {
    totalRevenue,
    pendingPayouts,
    settledPayouts,
    platformCommissionSplit: totalRevenue * 0.08, // Default 8% platform fee
    netCompanyEarnings: totalRevenue * 0.92,
  };
};

/**
 * Settle company payout (Platform Admin)
 */
export const settlePaymentPayout = async (paymentId) => {
  const payment = await Payment.findByIdAndUpdate(
    paymentId,
    {
      payoutStatus: "SETTLED",
      payoutSettledAt: new Date(),
    },
    { new: true, runValidators: true },
  );

  if (!payment) {
    throw new AppError("No payment found with that ID", 404);
  }

  return payment;
};

// Cash is settled by hand at pick-up. Only these methods may be marked
// collected manually; card and wallet rows must settle through their own
// gateway callback, otherwise a gateway capture and a manual collection could
// both land on the same booking.
const CASH_PAYMENT_METHODS = new Set(["CASH_ON_DELIVERY", "CASH"]);

// Bookings that have already ended in a terminal, non-rented state. Marking
// their payment COMPLETED would book revenue for a trip that never happened,
// so manual collection is refused rather than silently allowed.
const CLOSED_BOOKING_STATUSES = new Set(["CANCELLED", "EXPIRED"]);

/**
 * Guard for manual cash collection.
 *
 * Cash has no gateway callback proving who was paid, so the company that owns
 * the booking (or a platform admin) must be the one attesting the hand-off.
 * Admins may collect anything; anyone else must be a company user matching
 * payment.companyId. The tenant is taken from the resolved request tenant
 * first, because `req.tenantId` is what protect() derived from the session.
 *
 * Thrown as 403 rather than 404 so a missing relationship is never reported as
 * "not found", which would let callers probe other tenants' payment IDs.
 */
export const assertCashCollectionAccess = (payment, actorUser, tenantId = null) => {
  if (!payment) {
    throw new AppError("No payment record found with that ID", 404);
  }

  if (!actorUser) {
    throw new AppError("You are not logged in! Please log in to get access.", 401);
  }

  if (actorUser.role === "admin") return payment;

  if (actorUser.role !== "company") {
    throw new AppError(
      "Only the owning rental company or a platform admin can collect cash payments.",
      403,
    );
  }

  // A company session without a resolvable company must fail closed.
  const callerTenantId = (tenantId ?? actorUser.company)?.toString();
  const companyId = resolveId(payment.companyId);

  if (companyId && callerTenantId && companyId === callerTenantId) {
    return payment;
  }

  throw new AppError(
    "Access Denied. You are not permitted to collect this payment.",
    403,
  );
};

/**
 * Mark a cash-on-delivery payment as collected at pick-up.
 *
 * Cash bookings are created PENDING and would otherwise stay PENDING forever:
 * they never receive a gateway callback, so they never reached revenue
 * analytics or the payout ledger. This is the manual attestation that closes
 * the loop.
 *
 * Both writes run in one transaction, and the payment flip is guarded on
 * `status: "PENDING"` so two clerks racing on the same payment cannot collect
 * it twice. Collecting stamps `collectedAt`/`collectedBy` and - when a booking
 * was still waiting on money - advances `bookingStatus` PENDING_PAYMENT ->
 * CONFIRMED and `paymentStatus` -> PAID, following the
 * BOOKING_STATUS_TRANSITIONS matrix.
 *
 * Returns `{ payment, booking }` so the caller can show the settled ledger row
 * alongside the booking it belongs to.
 */
export const markCashPaymentCompleted = async ({
  paymentId,
  actorUser,
  tenantId = null,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) {
      throw new AppError("No payment record found with that ID", 404);
    }

    // Authorization runs before method/status so a foreign company can never
    // probe whether another tenant's payment is pending, completed or refunded.
    assertCashCollectionAccess(payment, actorUser, tenantId);

    if (!CASH_PAYMENT_METHODS.has(String(payment.paymentMethod).toUpperCase())) {
      throw new AppError(
        "Only cash payments can be marked as collected manually.",
        400,
      );
    }

    if (payment.status !== "PENDING") {
      throw new AppError(
        `This payment has already been ${String(payment.status).toLowerCase()}.`,
        409,
      );
    }

    const booking = await Booking.findById(payment.bookingId).session(session);
    if (!booking) {
      throw new AppError("No booking found with that ID", 404);
    }

    if (CLOSED_BOOKING_STATUSES.has(booking.bookingStatus)) {
      throw new AppError(
        "This booking is no longer active, so its payment cannot be collected.",
        409,
      );
    }

    const collectedAt = new Date();
    const collectedBy = actorUser._id ?? actorUser.id;

    const updatedPayment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: "PENDING" },
      {
        $set: {
          status: "COMPLETED",
          paidAt: collectedAt,
          collectedBy,
          collectedAt,
        },
      },
      { new: true, runValidators: true, session },
    );

    if (!updatedPayment) {
      throw new AppError("This payment has already been collected.", 409);
    }

    if (booking.paymentStatus !== "PAID") {
      booking.paymentStatus = "PAID";
      // Advance, never demote: a rental already ACTIVE keeps its state, while
      // one still waiting on money stops waiting. PENDING_PAYMENT -> CONFIRMED
      // follows BOOKING_STATUS_TRANSITIONS (money confirmed = CONFIRMED); the
      // counter later moves CONFIRMED -> ACTIVE when the rental actually
      // starts. We do not go straight to ACTIVE so a future pickup is never
      // presumed to have happened at the counter.
      if (booking.bookingStatus === "PENDING_PAYMENT") {
        booking.bookingStatus = "CONFIRMED";
      }
      await booking.save({ session, validateBeforeSave: false });
    }

    await session.commitTransaction();
    session.endSession();

    return { payment: updatedPayment, booking };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
