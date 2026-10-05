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
/**
 * Fetch all payments with filtering for Tenants/Admins
 *
 * Returns the requested page plus pagination metadata. The total is counted
 * against the identical filter, so a company or admin can page through its whole
 * ledger instead of silently stopping at the per-page cap.
 */
export const fetchAllPayments = async (queryParams, user) => {
  const filter = combineFilters(
    user.role === "company" ? { companyId: user.company } : null,
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
