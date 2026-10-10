import mongoose from "mongoose";
import Payment from "../models/payment_model.js";
import Booking from "../models/booking_model.js";
import Vehicle from "../models/vehicle_model.js";
import Company from "../models/Company_model.js";
import User from "../models/User_model.js";
import PlatformSettings from "../models/PlatformSettings_model.js";
import { getPlatformPolicy } from "./platformPolicyService.js";
import AppError from "../utils/appError.js";
import { resolvePagination, buildPaginationMeta } from "../utils/pagination.js";
import {
  isCashExpr,
  netContributionExpr,
  keptFractionExpr,
  netContributionOf,
} from "../utils/payoutNetting.js";

/**
 * Fleet-operator earnings & transactions workspace (/company/payouts).
 *
 * One tenant-scoped facet over the operator's *own* Payment ledger powers the
 * analytics deck (gross revenue, NexRide take, net company earnings, payout
 * liquidity split) exactly like buildPayoutSummary — recomputed from the real
 * documents, never seeded. A bounded popbed query answers the paginated
 * "Recent Transactions" register carrying the real customer, booking and
 * vehicle context for the row drawer.
 *
 * The `companyId` scope is fixed by the caller (see getCompanyEarnings) and
 * reused for the deck, the register, the vehicle-yield ranking and the chart,
 * so a forged query parameter cannot pivot the page onto another operator's
 * ledger. Filters (status / vehicle / method / search) only reshape the
 * register; the KPI deck always reflects the whole tenant within the selected
 * date range.
 *
 * "Banking" fields are intentionally absent: the payout rail is described from
 * the platform registry (payoutSchedule / clearingBank) because the Company
 * dossier does not model an IBAN, and money figures keep the same kept /
 * keptFraction refund semantics as the admin payout ledger so the two surfaces
 * can never disagree.
 */

const DAY_MS = 86400000;
const DECK_STATUSES = ["COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED"];
const KEEP_STATUSES = ["COMPLETED", "PARTIALLY_REFUNDED"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const referenceOf = (id) =>
  id ? `NX-${String(id).slice(-6).toUpperCase()}` : "NX-PENDING";

const trxOf = (id) => `#TRX-${String(id).slice(-6).toUpperCase()}`;

const round2 = (value) =>
  Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;

const round1 = (value) =>
  Number.isFinite(value) ? Math.round(value * 10) / 10 : null;

const startOfUtcDay = (offsetDays = 0) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date;
};

const startOfMonth = (offset = 0) => {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date;
};

const startOfYear = (offset = 0) =>
  new Date(Date.UTC(new Date().getUTCFullYear() + offset, 0, 1));

const VALID_RANGES = new Set([
  "all",
  "today",
  "7d",
  "30d",
  "thisMonth",
  "lastMonth",
  "3m",
  "year",
]);

/**
 * Resolve a user-facing range code into `{ from, to, prevFrom, prevTo }`
 * boundaries. Unbounded for "all"; unknown codes are ignored (fall back to the
 * whole ledger so a bad query string can never exclude data silently).
 */
const windowOf = (code) => {
  switch (code) {
    case "today":
      return {
        from: startOfUtcDay(0),
        prevFrom: startOfUtcDay(-1),
        prevTo: startOfUtcDay(0),
      };
    case "7d":
      return {
        from: startOfUtcDay(-7),
        prevFrom: startOfUtcDay(-14),
        prevTo: startOfUtcDay(-7),
      };
    case "30d":
      return {
        from: startOfUtcDay(-30),
        prevFrom: startOfUtcDay(-60),
        prevTo: startOfUtcDay(-30),
      };
    case "thisMonth":
      return { from: startOfMonth(0), prevFrom: startOfMonth(-1), prevTo: startOfMonth(0) };
    case "lastMonth":
      return {
        from: startOfMonth(-1),
        to: startOfMonth(0),
        prevFrom: startOfMonth(-2),
        prevTo: startOfMonth(-1),
      };
    case "3m":
      return {
        from: startOfUtcDay(-90),
        prevFrom: startOfUtcDay(-180),
        prevTo: startOfUtcDay(-90),
      };
    case "year":
      return { from: startOfYear(0), prevFrom: startOfYear(-1), prevTo: startOfYear(0) };
    default:
      return null;
  }
};

/**
 * Payments settle against `paidAt` when a gateway/cash capture happens, but a
 * refunded row resets paidAt to null, so windowing falls back to createdAt for
 * rows that never captured. Mirrors paymentService.paymentRangeFilter.
 */
const rangeCondition = (window) => {
  if (!window?.from) return null;
  const paidAt = { $gte: window.from };
  const createdAt = { $gte: window.from };
  if (window.to) {
    paidAt.$lt = window.to;
    createdAt.$lt = window.to;
  }
  return { $or: [{ paidAt }, { paidAt: null, createdAt }] };
};

// Shared kept/keptFraction derivation (identical to payoutService so the
// admin Commissions & Payouts ledger and this page agree on every figure).
// Two $addFields stages on purpose: this MongoDB does not resolve a field
// added in the same stage, so `keptFraction`/`netContribution` must reference
// `kept` from a stage earlier in the pipeline.
const keptFields = () => [
  {
    $addFields: {
      kept: {
        $switch: {
          branches: [
            {
              case: { $eq: ["$status", "PARTIALLY_REFUNDED"] },
              then: { $subtract: ["$amount", { $ifNull: ["$refundAmount", 0] }] },
            },
            { case: { $eq: ["$status", "REFUNDED"] }, then: 0 },
          ],
          default: "$amount",
        },
      },
      keepsRevenue: { $in: ["$status", KEEP_STATUSES] },
    },
  },
  {
    $addFields: {
      keptFraction: keptFractionExpr,
      // Cash-vs-card payout netting (same rules as the admin payout ledger):
      // cash already collected at the counter subtracts commission; every other
      // rail adds the company's net share. See utils/payoutNetting.js.
      isCash: isCashExpr,
      netContribution: netContributionExpr,
    },
  },
];

const totalsGroup = () => ({
  $group: {
    _id: null,
    gross: { $sum: { $cond: ["$keepsRevenue", "$kept", 0] } },
    platformTake: {
      $sum: {
        $cond: ["$keepsRevenue", { $multiply: ["$commissionAmount", "$keptFraction"] }, 0],
      },
    },
    companyEarnings: {
      $sum: {
        $cond: ["$keepsRevenue", { $multiply: ["$companyShare", "$keptFraction"] }, 0],
      },
    },
    unsettled: {
      $sum: {
        $cond: [
          { $and: ["$keepsRevenue", { $eq: ["$payoutStatus", "UNSETTLED"] }] },
          "$netContribution",
          0,
        ],
      },
    },
    processing: {
      $sum: {
        $cond: [
          { $and: ["$keepsRevenue", { $eq: ["$payoutStatus", "PROCESSING"] }] },
          "$netContribution",
          0,
        ],
      },
    },
    settled: {
      $sum: {
        $cond: [
          { $and: ["$keepsRevenue", { $eq: ["$payoutStatus", "SETTLED"] }] },
          "$netContribution",
          0,
        ],
      },
    },
    cashCommission: {
      $sum: {
        $cond: [
          { $and: ["$keepsRevenue", "$isCash"] },
          { $multiply: ["$commissionAmount", "$keptFraction"] },
          0,
        ],
      },
    },
    bookings: { $sum: { $cond: ["$keepsRevenue", 1, 0] } },
  },
});

const andWith = (filter, extra) =>
  extra && Object.keys(extra).length > 0 ? { $and: [filter, extra] } : filter;

// Register status chips map onto real ledger predicates. "completed" is a
// revenue row that has not been disbursed yet, "paid" is disbursed, "escrow"
// is captured but mid-rail, and "refunded" covers both refund degrees.
const STATUS_FILTERS = {
  completed: {
    $and: [{ status: "COMPLETED" }, { payoutStatus: "UNSETTLED" }],
  },
  paid: { $and: [{ status: "COMPLETED" }, { payoutStatus: "SETTLED" }] },
  escrow: { $and: [{ status: "COMPLETED" }, { payoutStatus: "PROCESSING" }] },
  refunded: { status: { $in: ["REFUNDED", "PARTIALLY_REFUNDED"] } },
};

// The design's "Moamalat / Sadad / Card" channel options are represented by
// the payment methods the ledger actually stores.
const METHOD_FILTERS = {
  cash: "CASH_ON_DELIVERY",
  card: "LOCAL_CARD",
  moamalat: "MOAMALAT",
  wallet: "WALLET",
};

const effectiveDateOf = (row) => row.paidAt ?? row.createdAt;

const keepOf = (row) => {
  if (row.status === "PARTIALLY_REFUNDED") {
    return (row.amount ?? 0) - (row.refundAmount ?? 0);
  }
  if (row.status === "REFUNDED") return 0;
  return row.amount ?? 0;
};

const fractionOf = (row) => {
  const kept = keepOf(row);
  const amount = row.amount ?? 0;
  return amount > 0 ? kept / amount : 0;
};

const labelOfDay = (date) => `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;

/**
 * Chart series buckets. 7d -> 7 daily slots, 30d -> 5 weekly slots,
 * 3m -> 13 weekly slots, 12m -> 12 calendar months.
 */
const bucketsOf = (chartRange) => {
  const now = Date.now();
  if (chartRange === "7d") {
    const from = now - 7 * DAY_MS;
    return Array.from({ length: 7 }, (_, index) => {
      const dateFrom = from + index * DAY_MS;
      const dateTo = index === 6 ? from + 7 * DAY_MS : dateFrom + DAY_MS;
      const anchor = new Date(dateFrom);
      return { key: `d${index + 1}`, label: labelOfDay(anchor), dateFrom, dateTo };
    });
  }
  if (chartRange === "30d" || chartRange === "3m") {
    const days = chartRange === "30d" ? 30 : 90;
    const count = chartRange === "30d" ? 5 : 13;
    const from = now - days * DAY_MS;
    return Array.from({ length: count }, (_, index) => {
      const dateFrom = from + index * 7 * DAY_MS;
      const dateTo = index === count - 1 ? from + days * DAY_MS : dateFrom + 7 * DAY_MS;
      return { key: `w${index + 1}`, label: `W${index + 1}`, dateFrom, dateTo };
    });
  }
  return Array.from({ length: 12 }, (_, index) => {
    const anchor = startOfMonth(-11 + index);
    const next = startOfMonth(-11 + index + 1);
    return {
      key: `${anchor.getUTCFullYear()}-${String(anchor.getUTCMonth() + 1).padStart(2, "0")}`,
      label: `${MONTHS[anchor.getUTCMonth()]} ${String(anchor.getUTCFullYear()).slice(2)}`,
      dateFrom: anchor.getTime(),
      dateTo: next.getTime(),
    };
  });
};

const chartWindowOf = (chartRange) => {
  if (chartRange === "7d") return { from: new Date(Date.now() - 7 * DAY_MS) };
  if (chartRange === "30d") return { from: new Date(Date.now() - 30 * DAY_MS) };
  if (chartRange === "3m") return { from: new Date(Date.now() - 90 * DAY_MS) };
  if (chartRange === "12m") return { from: startOfMonth(-11) };
  return null;
};

const bucketize = (rows, chartRange) => {
  const buckets = bucketsOf(chartRange);
  const totals = buckets.map((bucket) => ({ ...bucket, gross: 0, fee: 0, net: 0, tx: 0 }));

  rows.forEach((row) => {
    if (!KEEP_STATUSES.includes(row.status)) return;
    const date = effectiveDateOf(row);
    if (!date) return;
    const time = new Date(date).getTime();

    let index = -1;
    if (chartRange === "12m") {
      const dateUtc = new Date(date);
      const anchorYear = new Date(totals[0].dateFrom).getUTCFullYear();
      const anchorMonth = new Date(totals[0].dateFrom).getUTCMonth();
      index =
        (dateUtc.getUTCFullYear() - anchorYear) * 12 +
        (dateUtc.getUTCMonth() - anchorMonth);
    } else {
      index = Math.floor((time - totals[0].dateFrom) / (7 * DAY_MS));
      if (chartRange === "7d") index = Math.floor((time - totals[0].dateFrom) / DAY_MS);
    }
    if (index < 0) index = 0;
    if (index > totals.length - 1) index = totals.length - 1;

    const kept = keepOf(row);
    const fraction = fractionOf(row);
    totals[index].gross += kept;
    totals[index].fee += (row.commissionAmount ?? 0) * fraction;
    // Netting twin of the ledger: cash subtracts commission, others add the
    // company net share (refund-aware). Same figures as payoutService.
    totals[index].net += netContributionOf(row);
    totals[index].tx += 1;
  });

  return totals.map((bucket) => ({
    ...bucket,
    gross: round2(bucket.gross),
    fee: round2(bucket.fee),
    net: round2(bucket.net),
    tx: bucket.tx,
  }));
};

/**
 * Search across gateay references, #TRX ids, #NX booking ids (scoped to the
 * tenant's own bookings), customer identity and vehicle make/model.
 */
const buildEarningsSearch = async (search, scope) => {
  const term = typeof search === "string" ? search.trim() : "";
  if (!term) return null;

  const regex = new RegExp(escapeRegExp(term), "i");
  const [customerIds, bookingRows, vehicleIds] = await Promise.all([
    User.distinct("_id", { $or: [{ name: regex }, { email: regex }, { phoneNumber: regex }] }),
    Booking.aggregate([
      { $match: { companyId: scope } },
      {
        $addFields: {
          searchReference: {
            $concat: [
              "NX-",
              { $toUpper: { $substrCP: [{ $toString: "$_id" }, 18, 6] } },
            ],
          },
        },
      },
      { $match: { searchReference: regex } },
      { $project: { _id: 1 } },
    ]),
    Vehicle.distinct("_id", {
      companyId: scope,
      deletedAt: null,
      $or: [{ make: regex }, { model: regex }],
    }),
  ]);

  let bookingIds = bookingRows.map((row) => row._id);
  if (vehicleIds.length > 0) {
    const vehicleBookingIds = await Booking.distinct("_id", {
      companyId: scope,
      vehicleId: { $in: vehicleIds },
    });
    bookingIds = [...new Set([...bookingIds, ...vehicleBookingIds])];
  }

  return {
    $or: [
      { merchantReference: regex },
      { transactionId: regex },
      { paymentMethod: regex },
      { customerId: { $in: customerIds } },
      { bookingId: { $in: bookingIds } },
      {
        $expr: {
          $regexMatch: {
            input: {
              $concat: [
                "#TRX-",
                { $toUpper: { $substrCP: [{ $toString: "$_id" }, 18, 6] } },
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

const firstOf = (docs, key) => {
  const first = docs && docs.length > 0 ? docs[0] : {};
  return round2(first[key] ?? 0);
};

/**
 * Build the tenant-scoped earnings deck + one page of the register.
 */
export const buildCompanyEarnings = async ({
  companyId,
  page,
  limit,
  range,
  chartRange,
  search,
  status,
  vehicleId,
  method,
}) => {
  if (!mongoose.isValidObjectId(companyId)) {
    throw new AppError("Invalid company identifier.", 400);
  }
  const scope = new mongoose.Types.ObjectId(companyId);
  const company = await Company.findById(companyId).select("name slug customCommissionRate");
  if (!company) {
    throw new AppError("No company found with that ID.", 404);
  }
  const platformPolicy = await getPlatformPolicy();

  const rangeCode = VALID_RANGES.has(range) ? range : "all";
  const window = windowOf(rangeCode);
  const chartCode = ["7d", "30d", "3m", "12m"].includes(chartRange)
    ? chartRange
    : "30d";

  // ---------------------------------------------------------------------------
  // 1. KPI deck — tenant-scoped facet over the current and previous windows so
  //    the growth delta pill is computed from real ledgers, not editorialised.
  // ---------------------------------------------------------------------------
  const currentWindowMatch = rangeCondition(window);
  const facets = {
    current: currentWindowMatch
      ? [{ $match: currentWindowMatch }, keptFields(), totalsGroup()]
      : [keptFields(), totalsGroup()],
  };
  if (window?.prevFrom) {
    facets.previous = [
      { $match: rangeCondition({ from: window.prevFrom, to: window.prevTo }) },
      keptFields(),
      totalsGroup(),
    ];
  }

  const [deckFacet] = await Payment.aggregate([
    { $match: { companyId: scope, status: { $in: DECK_STATUSES } } },
    { $facet: facets },
  ]);

  const current = deckFacet?.current?.[0];
  const previous = deckFacet?.previous?.[0];
  const gross = round2(current?.gross ?? 0);
  const platformTake = round2(current?.platformTake ?? 0);
  const companyEarnings = round2(current?.companyEarnings ?? 0);
  const prevGross = firstOf(deckFacet?.previous, "gross");
  const grossDeltaPct =
    prevGross > 0 ? round1(((gross - prevGross) / prevGross) * 100) : null;

  // ---------------------------------------------------------------------------
  // 2. Vehicle yield ranking + fleet mix (real bookings joined to real units)
  // ---------------------------------------------------------------------------
  const yieldPipeline = [
    { $match: { companyId: scope, status: { $in: DECK_STATUSES } } },
  ];
  const windowMatch = rangeCondition(window);
  if (windowMatch) yieldPipeline.push({ $match: windowMatch });
  yieldPipeline.push(
    keptFields(),
    {
      $lookup: {
        from: "bookings",
        localField: "bookingId",
        foreignField: "_id",
        as: "booking",
      },
    },
    { $unwind: { path: "$booking", preserveNullAndEmptyArrays: true } },
    { $addFields: { vehicleId: "$booking.vehicleId" } },
    { $match: { keepsRevenue: true } },
    {
      $group: {
        _id: "$vehicleId",
        gross: { $sum: "$kept" },
        bookings: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "vehicles",
        localField: "_id",
        foreignField: "_id",
        as: "vehicle",
      },
    },
    { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },
  );

  const yieldRows = await Payment.aggregate(yieldPipeline);
  const earnedVehicles = yieldRows
    .filter((row) => row.vehicle && row.gross > 0)
    .map((row) => ({
      vehicle: {
        id: row.vehicle._id.toString(),
        make: row.vehicle.make,
        model: row.vehicle.model,
        year: row.vehicle.year ?? null,
        type: row.vehicle.type ?? null,
        photo: row.vehicle.photos?.[0] ?? null,
      },
      gross: round2(row.gross),
      bookings: row.bookings ?? 0,
    }))
    .sort((a, b) => b.gross - a.gross);

  const fleetGross = earnedVehicles.reduce((sum, row) => sum + row.gross, 0);
  const topVehicles = earnedVehicles.slice(0, 5).map((row, index) => ({
    rank: index + 1,
    ...row,
    sharePct: fleetGross > 0 ? round1((row.gross / fleetGross) * 100) : 0,
  }));

  const mixByType = new Map();
  earnedVehicles.forEach((row) => {
    const type = row.vehicle.type ?? "OTHER";
    const entry = mixByType.get(type) ?? { type, gross: 0 };
    entry.gross += row.gross;
    mixByType.set(type, entry);
  });
  const mix = [...mixByType.values()]
    .map((entry) => ({
      type: entry.type,
      gross: round2(entry.gross),
      pct: fleetGross > 0 ? round1((entry.gross / fleetGross) * 100) : 0,
    }))
    .sort((a, b) => b.gross - a.gross);

  const filterVehicles = earnedVehicles.map((row) => row.vehicle);

  // ---------------------------------------------------------------------------
  // 3. Revenue chart — buckets computed from the real ledger rows in the window
  // ---------------------------------------------------------------------------
  const chartWindow = chartWindowOf(chartCode);
  const chartRows = await Payment.aggregate([
    { $match: { companyId: scope, status: { $in: DECK_STATUSES } } },
    ...(chartWindow ? [{ $match: rangeCondition(chartWindow) }] : []),
    {
      $project: {
        amount: 1,
        commissionAmount: 1,
        companyShare: 1,
        status: 1,
        refundAmount: 1,
        paymentMethod: 1,
        createdAt: 1,
        paidAt: 1,
      },
    },
  ]);

  const buckets = bucketize(chartRows, chartCode);
  const chartNet = buckets.reduce((sum, bucket) => sum + bucket.net, 0);
  const days =
    chartCode === "12m"
      ? Math.max(1, Math.round((Date.now() - chartWindow.from.getTime()) / DAY_MS))
      : { "7d": 7, "30d": 30, "3m": 90 }[chartCode];
  const topBucket = [...buckets].sort((a, b) => b.gross - a.gross)[0];

  // ---------------------------------------------------------------------------
  // 4. Payout rail description from the platform registry (real schedule/bank)
  // ---------------------------------------------------------------------------
  let payoutSchedule = "Weekly on Thursdays";
  let clearingBank = "Libyan Foreign Bank (LFB)";
  try {
    const settings = await PlatformSettings.findOne({ key: "platform" });
    payoutSchedule = settings?.commission?.payoutSchedule || payoutSchedule;
    clearingBank = settings?.commission?.clearingBank || clearingBank;
  } catch {
    // Registry missing — schema defaults above are the fallback.
  }

  // ---------------------------------------------------------------------------
  // 5. Paginated register — bounded query with the tenant + window + filters
  // ---------------------------------------------------------------------------
  const { page: safePage, limit: safeLimit, skip } = resolvePagination(
    { page, limit },
    { defaultLimit: 8 },
  );

  let listFilter = { companyId: scope, status: { $in: DECK_STATUSES } };
  if (currentWindowMatch) {
    listFilter = andWith(listFilter, currentWindowMatch);
  }
  const searchOr = await buildEarningsSearch(search, scope);
  if (searchOr) listFilter = andWith(listFilter, searchOr);
  const statusFilter = STATUS_FILTERS[status];
  if (statusFilter) listFilter = andWith(listFilter, statusFilter);
  if (METHOD_FILTERS[method]) {
    listFilter = andWith(listFilter, { paymentMethod: METHOD_FILTERS[method] });
  }
  if (vehicleId && mongoose.isValidObjectId(vehicleId)) {
    const targetBookings = await Booking.distinct("_id", {
      companyId: scope,
      vehicleId: new mongoose.Types.ObjectId(vehicleId),
    });
    listFilter = andWith(listFilter, { bookingId: { $in: targetBookings } });
  }

  const listTotal = await Payment.countDocuments(listFilter);
  const listDocs = await Payment.find(listFilter)
    .sort({ paidAt: -1, createdAt: -1 })
    .skip(skip)
    .limit(safeLimit)
    .populate("customerId", "name email phoneNumber photo")
    .populate("bookingId");

  const list = listDocs.map((payment) => {
    const booking = payment.bookingId;
    const vehicle = booking?.vehicleId;
    const customer = payment.customerId;

    return {
      id: payment._id.toString(),
      trxRef: trxOf(payment._id),
      amount: payment.amount,
      commissionAmount: payment.commissionAmount,
      commissionRate: payment.commissionRate,
      companyShare: payment.companyShare,
      refundAmount: payment.refundAmount ?? 0,
      paymentMethod: payment.paymentMethod,
      merchantReference: payment.merchantReference ?? null,
      transactionId: payment.transactionId ?? null,
      status: payment.status,
      payoutStatus: payment.payoutStatus,
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt?.toISOString() ?? null,
      customer: {
        id: customer?._id?.toString() ?? null,
        name: customer?.name ?? "Customer",
        email: customer?.email ?? null,
        phone: customer?.phoneNumber ?? null,
        photo: customer?.photo ?? null,
      },
      booking: booking
        ? {
            id: booking._id.toString(),
            reference: referenceOf(booking._id),
            pickupLocation: booking.pickupLocation ?? null,
            pickupMethod: booking.pickupMethod ?? "BRANCH_PICKUP",
            startDate: booking.startDate?.toISOString() ?? null,
            endDate: booking.endDate?.toISOString() ?? null,
            dailyRate: booking.dailyRate ?? 0,
            totalDays: booking.totalDays ?? null,
            rentalPrice: booking.rentalPrice ?? 0,
            discountAmount: booking.discountAmount ?? 0,
            commissionRate: booking.commissionRate ?? null,
          }
        : null,
      vehicle: vehicle
        ? {
            id: vehicle._id.toString(),
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year ?? null,
            type: vehicle.type ?? null,
            photo: vehicle.photos?.[0] ?? null,
          }
        : null,
    };
  });

  return {
    company: {
      name: company.name,
      slug: company.slug,
      commissionRate:
        company.customCommissionRate ?? platformPolicy.commissionRatePct,
    },
    range: { code: rangeCode, from: window?.from ?? null, to: window?.to ?? null },
    settings: { payoutSchedule, clearingBank },
    summary: {
      gross,
      bookings: current?.bookings ?? 0,
      platformTake,
      companyEarnings,
      effectiveRate: gross > 0 ? round2((platformTake / gross) * 100) : 0,
      grossDeltaPct,
      // Cash-vs-card netting: cash commissions owe the platform, so the payout
      // deck is bounded at zero and the uncovered balance is flagged instead
      // of ever being shown as a negative "payout".
      available: Math.max(0, round2(current?.unsettled ?? 0)),
      inEscrow: Math.max(0, round2(current?.processing ?? 0)),
      disbursed: round2(current?.settled ?? 0),
      cashCommission: round2(current?.cashCommission ?? 0),
      nettedBalance: round2(
        (current?.unsettled ?? 0) + (current?.processing ?? 0),
      ),
      outstandingCommission: Math.max(
        0,
        -round2((current?.unsettled ?? 0) + (current?.processing ?? 0)),
      ),
    },
    chart: {
      range: chartCode,
      buckets,
      avgTakePerDay: round2(days > 0 ? chartNet / days : 0),
      topWindow: topBucket ? { label: topBucket.label, gross: topBucket.gross } : null,
    },
    topVehicles,
    mix,
    vehicles: filterVehicles,
    list,
    pagination: buildPaginationMeta({
      page: safePage,
      limit: safeLimit,
      total: listTotal,
    }),
  };
};
