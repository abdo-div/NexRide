import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Vehicle from "../models/vehicle_model.js";
import Company from "../models/Company_model.js";
import AppError from "../utils/appError.js";
import { resolvePagination, buildPaginationMeta } from "../utils/pagination.js";

/**
 * Fleet-operator bookings & dispatches register.
 *
 * One tenant-scoped, server-side aggregation powers both the page summary (the
 * 5-card deck + tab counts) and the paginated list behind the search/filter
 * toolbar. The `companyId` scope is fixed by the caller (protect() =>
 * req.tenantId), never taken from the request body by a company session, so a
 * forged query parameter cannot pivot the register onto another operator's
 * bookings — the tenant failure mode is identical to the dashboard service.
 *
 * Customer / vehicle / pickup matches run inside MongoDB via $lookup joins over
 * the same scoped $match, and the page metadata is counted from exactly the
 * result set the rows were drawn from, so the total always matches the pages.
 */

const ACTIVE_STATUSES = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "ACTIVE"];
const HANDOVER_STATUSES = ["PAID", "CONFIRMED"];

/** Display-status groups shared by the toolbar tabs and Status dropdown. */
const STATUS_GROUP_FILTER = {
  PENDING: ["PENDING_PAYMENT"],
  CONFIRMED: ["PAID", "CONFIRMED"],
  ACTIVE: ["ACTIVE"],
  COMPLETED: ["COMPLETED"],
  CANCELLED: ["CANCELLED", "EXPIRED"],
};

const VALID_VIEWS = new Set(["ALL", "UPCOMING", "HANDOVER"]);
const VALID_PAYMENTS = new Set(["PAID", "PENDING", "FAILED", "REFUNDED"]);

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const referenceOf = (id) =>
  id ? `NX-${String(id).slice(-6).toUpperCase()}` : "NX-PENDING";

const initialsOf = (name) => {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "--";
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
};

/**
 * Display payment state for a booking, resolved from the booking's own
 * `paymentStatus` first and then the linked payment ledger rows. Everything is
 * derived from real maintained fields — there is no client-supplied state here.
 */
const displayPayment = (doc) => {
  if (doc.paymentStatus === "PAID") return "PAID";
  if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(doc.paymentStatus)) {
    return "REFUNDED";
  }
  const payments = doc.payments ?? [];
  const has = (s) => payments.some((p) => p?.status === s);
  const ended = ["CANCELLED", "EXPIRED"].includes(doc.bookingStatus);
  if (has("COMPLETED")) return ended ? "REFUNDED" : "PAID";
  if (has("PENDING")) return "PENDING";
  if (has("FAILED")) return "FAILED";
  return ended ? "REFUNDED" : "PENDING";
};

/** Booking-channel label: delivery contracts, else the paid gateway method. */
const channelOf = (doc) => {
  if (doc.pickupMethod === "DELIVERY") return "delivery";
  const paidMethod = (doc.payments ?? [])
    .filter((p) => p?.status === "COMPLETED")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.paymentMethod;
  switch (paidMethod) {
    case "MOAMALAT":
      return "moamalat";
    case "LOCAL_CARD":
      return "card";
    case "WALLET":
      return "wallet";
    case "CASH_ON_DELIVERY":
      return "cash";
    default:
      return "branch";
  }
};

/** Preferred payment ledger row, for the escrow/payout posture in the drawer. */
const latestPayment = (doc) => {
  const payments = doc.payments ?? [];
  if (payments.length === 0) return null;
  const rank = (p) =>
    p.status === "COMPLETED" ? 0 : p.status === "PENDING" ? 1 : p.status === "FAILED" ? 2 : 3;
  return [...payments].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
      0,
  )[0];
};

const mapRow = (doc) => {
  const vehicle = doc.vehicle ?? {};
  const customer = doc.customer ?? {};
  const paymentState = doc.resolvedPayment;
  const ledger = latestPayment(doc);

  return {
    id: doc._id,
    reference: referenceOf(doc._id),
    channel: channelOf(doc),
    verified: paymentState === "PAID",
    paymentId: ledger?._id ?? null,
    ledger: ledger
      ? {
          id: String(ledger._id),
          status: ledger.status ?? null,
          method: ledger.paymentMethod ?? null,
          amount: ledger.amount ?? null,
        }
      : null,
    customer: {
      initials: initialsOf(customer.name),
      name: customer.name ?? "Customer",
      phone: customer.phoneNumber ?? null,
    },
    vehicle: {
      photo: vehicle.photos?.[0] ?? null,
      make: vehicle.make ?? "Vehicle",
      model: vehicle.model ?? "",
      year: vehicle.year ?? null,
      hub: vehicle.city ?? null,
    },
    startDate: doc.startDate,
    endDate: doc.endDate,
    days: doc.totalDays,
    totalAmount: doc.totalAmount,
    companyShare: doc.companyShare,
    payment: paymentState,
    bookingStatus: doc.bookingStatus,
    detail: {
      title:
        [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "NexRide Vehicle",
      photo: vehicle.photos?.[0] ?? null,
      vehicleType: vehicle.type ?? null,
      vehicleHub: vehicle.city ?? null,
      customerName: customer.name ?? "Customer",
      customerPhone: customer.phoneNumber ?? null,
      pickupLocation: doc.pickupLocation,
      pickupMethod: doc.pickupMethod,
      dailyRate: doc.dailyRate,
      totalDays: doc.totalDays,
      totalAmount: doc.totalAmount,
      companyShare: doc.companyShare,
      resolvedPayment: paymentState,
      payoutStatus: ledger?.payoutStatus ?? null,
      checks: [
        {
          key: "gps",
          done: Boolean(vehicle.location?.coordinates?.length === 2),
        },
        { key: "ready", done: vehicle.operationalStatus === "AVAILABLE" },
        { key: "paid", done: paymentState === "PAID" },
        { key: "signed", done: false },
      ],
    },
  };
};

export const buildCompanyBookings = async ({
  companyId,
  view,
  search,
  status,
  payment,
  vehicleId,
  fromDate,
  page,
  limit,
} = {}) => {
  if (!companyId) {
    throw new AppError("Company tenant is required.", 400);
  }
  if (!mongoose.isValidObjectId(companyId)) {
    throw new AppError("Invalid company identifier.", 400);
  }

  const scope = { companyId: new mongoose.Types.ObjectId(companyId) };
  const startToday = startOfDay(new Date());
  const { page: safePage, limit: safeLimit, skip } = resolvePagination(
    { page, limit },
    { defaultLimit: 10, maxLimit: 100 },
  );

  // ---------------------------------------------------------------------------
  // Summary deck + tab counts (all-time status ledger for the tenant)
  // ---------------------------------------------------------------------------
  const [statusRows, upcoming, handover] = await Promise.all([
    Booking.aggregate([
      { $match: scope },
      { $group: { _id: "$bookingStatus", count: { $sum: 1 } } },
    ]),
    Booking.countDocuments({
      companyId: scope.companyId,
      bookingStatus: { $in: ACTIVE_STATUSES },
      startDate: { $gte: startToday },
    }),
    Booking.countDocuments({
      companyId: scope.companyId,
      bookingStatus: { $in: HANDOVER_STATUSES },
      startDate: { $gte: startToday },
    }),
  ]);

  const byStatus = new Map(statusRows.map((r) => [r?._id, r?.count ?? 0]));
  const countOf = (list) => list.reduce((acc, s) => acc + (byStatus.get(s) ?? 0), 0);

  const total = [...byStatus.values()].reduce((a, b) => a + b, 0);
  const summary = {
    total,
    pending: countOf(["PENDING_PAYMENT"]),
    confirmed: countOf(["PAID", "CONFIRMED"]),
    active: countOf(["ACTIVE"]),
    completed: countOf(["COMPLETED"]),
    cancelled: countOf(["CANCELLED", "EXPIRED"]),
    upcoming,
    handover,
  };

  // ---------------------------------------------------------------------------
  // Vehicle options for the Fleet dropdown (the tenant's own units only)
  // ---------------------------------------------------------------------------
  const vehicles = await Vehicle.find({
    companyId: scope.companyId,
    deletedAt: null,
  })
    .select("make model year type")
    .lean()
    .sort({ make: 1, model: 1 });

  const vehicleOptions = (vehicles ?? []).map((v) => ({
    id: v._id,
    make: v.make ?? "Vehicle",
    model: v.model ?? "",
    year: v.year ?? null,
  }));

  // ---------------------------------------------------------------------------
  // Tenant + view/status/date/vehicle scoping for the list pipeline
  // ---------------------------------------------------------------------------
  const baseMatch = { companyId: scope.companyId };
  if (view === "UPCOMING") {
    baseMatch.bookingStatus = { $in: ACTIVE_STATUSES };
    baseMatch.startDate = { $gte: startToday };
  } else if (view === "HANDOVER") {
    baseMatch.bookingStatus = { $in: HANDOVER_STATUSES };
    baseMatch.startDate = { $gte: startToday };
  } else if (STATUS_GROUP_FILTER[status]) {
    baseMatch.bookingStatus = { $in: STATUS_GROUP_FILTER[status] };
  }

  if (fromDate) {
    const from = new Date(fromDate);
    if (!Number.isNaN(from.getTime())) {
      baseMatch.startDate = { ...(baseMatch.startDate ?? {}), $gte: startOfDay(from) };
    }
  }

  if (vehicleId && mongoose.isValidObjectId(vehicleId)) {
    baseMatch.vehicleId = new mongoose.Types.ObjectId(vehicleId);
  }

  // ---------------------------------------------------------------------------
  // Search ($lookup-dependent, so it must run after the joins)
  // ---------------------------------------------------------------------------
  const searchTerm = String(search ?? "").trim().slice(0, 80);
  const searchMatch = {};
  if (searchTerm) {
    const pattern = new RegExp(escapeRegExp(searchTerm), "i");
    const clauses = [
      { pickupLocation: pattern },
      { "vehicle.make": pattern },
      { "vehicle.model": pattern },
      { "customer.name": pattern },
    ];
    const ref = searchTerm.match(/^NX-([A-Za-z0-9]+)$/i);
    if (ref) {
      clauses.push({
        $expr: {
          $regexMatch: {
            input: { $toString: "$_id" },
            regex: `${escapeRegExp(ref[1])}$`,
            options: "i",
          },
        },
      });
    }
    if (mongoose.isValidObjectId(searchTerm)) {
      clauses.push({ _id: new mongoose.Types.ObjectId(searchTerm) });
    }
    searchMatch.$or = clauses;
  }

  const paymentMatch = VALID_PAYMENTS.has(payment) ? { resolvedPayment: payment } : {};

  // ---------------------------------------------------------------------------
  // The list pipeline: scoped $match → joins → resolved payment → filters →
  // stable sort → faceted page. `resolvedPayment` is computed *inside* Mongo so
  // the facet total counts the same records the payment filter keeps.
  // ---------------------------------------------------------------------------
  const [facet] = await Booking.aggregate([
    { $match: baseMatch },
    {
      $lookup: {
        from: "vehicles",
        localField: "vehicleId",
        foreignField: "_id",
        as: "vehicle",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "customerId",
        foreignField: "_id",
        as: "customer",
      },
    },
    {
      $lookup: {
        from: "payments",
        localField: "_id",
        foreignField: "bookingId",
        as: "payments",
      },
    },
    { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        resolvedPayment: {
          $switch: {
            branches: [
              { case: { $eq: ["$paymentStatus", "PAID"] }, then: "PAID" },
              {
                case: {
                  $in: ["$paymentStatus", ["REFUNDED", "PARTIALLY_REFUNDED"]],
                },
                then: "REFUNDED",
              },
              {
                case: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$payments",
                          as: "p",
                          cond: { $eq: ["$$p.status", "COMPLETED"] },
                        },
                      },
                    },
                    0,
                  ],
                },
                then: {
                  $cond: [
                    { $in: ["$bookingStatus", ["CANCELLED", "EXPIRED"]] },
                    "REFUNDED",
                    "PAID",
                  ],
                },
              },
              {
                case: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$payments",
                          as: "p",
                          cond: { $eq: ["$$p.status", "PENDING"] },
                        },
                      },
                    },
                    0,
                  ],
                },
                then: "PENDING",
              },
              {
                case: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$payments",
                          as: "p",
                          cond: { $eq: ["$$p.status", "FAILED"] },
                        },
                      },
                    },
                    0,
                  ],
                },
                then: "FAILED",
              },
              {
                case: { $in: ["$bookingStatus", ["CANCELLED", "EXPIRED"]] },
                then: "REFUNDED",
              },
            ],
            default: "PENDING",
          },
        },
      },
    },
    ...(Object.keys(searchMatch).length > 0 ? [{ $match: searchMatch }] : []),
    ...(Object.keys(paymentMatch).length > 0 ? [{ $match: paymentMatch }] : []),
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        rows: [
          { $skip: skip },
          { $limit: safeLimit },
          {
            $project: {
              _id: 1,
              bookingStatus: 1,
              paymentStatus: 1,
              pickupMethod: 1,
              pickupLocation: 1,
              startDate: 1,
              endDate: 1,
              totalDays: 1,
              totalAmount: 1,
              dailyRate: 1,
              companyShare: 1,
              createdAt: 1,
              vehicle: 1,
              customer: 1,
              payments: 1,
              resolvedPayment: 1,
            },
          },
        ],
      },
    },
  ]);

  const totalAfterFilters = facet?.metadata?.[0]?.total ?? 0;
  const rows = (facet?.rows ?? []).map(mapRow);

  // Company profile for the scoped-tenant pill (name + operator code).
  const company = await Company.findById(companyId).select("name slug");

  return {
    period: { from: null, to: null },
    company: company
      ? {
          id: company.id,
          name: company.name,
          code: company.slug  
            ? `#${company.slug}`
            : `#OP-${String(company.id).slice(-4).toUpperCase()}`,
        }
      : null,
    summary,
    vehicles: vehicleOptions,
    list: rows,
    pagination: buildPaginationMeta({
      page: safePage,
      limit: safeLimit,
      total: totalAfterFilters,
    }),
  };
};