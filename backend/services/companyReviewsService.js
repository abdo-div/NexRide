import mongoose from "mongoose";
import Review from "../models/review_model.js";
import Vehicle from "../models/vehicle_model.js";
import Company from "../models/Company_model.js";
import AppError from "../utils/appError.js";
import { resolvePagination, buildPaginationMeta } from "../utils/pagination.js";

/**
 * Fleet-operator reviews & ratings workspace.
 *
 * One tenant-scoped aggregate powers the analytics deck (KPI summary, star
 * distribution, monthly trend, vehicle leaderboard, filter options) and a
 * separate bounded query answers the paginated "All Ratings" register. The
 * `companyId` scope is fixed by the caller (protect() => req.tenantId) — a
 * forged query parameter cannot pivot the deck onto another operator's
 * reviews. Every number the deck exposes is recomputed from the real Review
 * documents of that tenant; nothing is seeded or editorialised.
 *
 * The register rows carry the real customer, vehicle and booking context
 * (populated through the booking ledger), plus the operator's persisted reply
 * when one exists — "responded vs awaiting" is derived from that field.
 */

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
    .map((part) => part[0].toUpperCase())
    .join("");
};

const round1 = (value) =>
  Number.isFinite(value) ? Math.round(value * 10) / 10 : null;

const monthKey = (year, month) =>
  `${year}-${String(month).padStart(2, "0")}`;

const startOfMonth = (offset = 0) => {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date;
};

const periodFrom = (period) => {
  switch (period) {
    case "30d": {
      const from = new Date();
      from.setUTCHours(0, 0, 0, 0);
      from.setUTCDate(from.getUTCDate() - 30);
      return from;
    }
    case "90d": {
      const from = new Date();
      from.setUTCHours(0, 0, 0, 0);
      from.setUTCDate(from.getUTCDate() - 90);
      return from;
    }
    case "year":
      return new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    default:
      return null;
  }
};

const first = (docs) => (docs && docs.length > 0 ? docs[0] : undefined);

const countOf = (docs) => first(docs)?.count ?? 0;

/**
 * Build the tenant-scoped reviews deck + one page of the register.
 */
export const buildCompanyReviews = async ({
  companyId,
  page,
  limit,
  star,
  vehicleId,
  status,
  period,
}) => {
  if (!mongoose.isValidObjectId(companyId)) {
    throw new AppError("Invalid company identifier.", 400);
  }
  const scope = new mongoose.Types.ObjectId(companyId);
  const company = await Company.findById(companyId).select("name slug");
  if (!company) {
    throw new AppError("No company found with that ID.", 404);
  }

  // ---------------------------------------------------------------------------
  // 1. Analytics deck — one tenant-scoped facet over every review
  // ---------------------------------------------------------------------------
  const currentMonthStart = startOfMonth(0);
  const previousMonthStart = startOfMonth(-1);
  const twelveMonthsAgoStart = startOfMonth(-11);

  const [deckFacet] = await Review.aggregate([
    { $match: { companyId: scope } },
    {
      $facet: {
        total: [{ $count: "count" }],
        avg: [{ $group: { _id: null, value: { $avg: "$rating" } } }],
        distribution: [{ $group: { _id: "$rating", count: { $sum: 1 } } }],
        responded: [
          { $match: { "companyResponse.respondedAt": { $ne: null } } },
          { $count: "count" },
        ],
        responseHours: [
          { $match: { "companyResponse.respondedAt": { $ne: null } } },
          {
            $project: {
              ms: { $subtract: ["$companyResponse.respondedAt", "$createdAt"] },
            },
          },
          { $group: { _id: null, avgMs: { $avg: "$ms" } } },
        ],
        byVehicle: [
          {
            $group: {
              _id: "$vehicleId",
              count: { $sum: 1 },
              avg: { $avg: "$rating" },
              positive: {
                $sum: { $cond: [{ $gte: ["$rating", 4] }, 1, 0] },
              },
            },
          },
        ],
        distinctVehicles: [{ $group: { _id: "$vehicleId" } }, { $count: "count" }],
        currentMonth: [
          { $match: { createdAt: { $gte: currentMonthStart } } },
          { $count: "count" },
        ],
        previousMonth: [
          {
            $match: {
              createdAt: { $gte: previousMonthStart, $lt: currentMonthStart },
            },
          },
          { $count: "count" },
        ],
        trendBuckets: [
          { $match: { createdAt: { $gte: twelveMonthsAgoStart } } },
          {
            $group: {
              _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
              count: { $sum: 1 },
              avg: { $avg: "$rating" },
            },
          },
        ],
      },
    },
  ]);

  const total = countOf(deckFacet?.total);
  const avg = round1(first(deckFacet?.avg)?.value);
  const responded = countOf(deckFacet?.responded);
  const thisMonth = countOf(deckFacet?.currentMonth);
  const previousMonth = countOf(deckFacet?.previousMonth);
  const distinctVehicles = countOf(deckFacet?.distinctVehicles);

  const monthChangePct =
    previousMonth > 0
      ? Math.round(((thisMonth - previousMonth) / previousMonth) * 1000) / 10
      : null;

  const avgHours = first(deckFacet?.responseHours)?.avgMs;
  const avgResponseHours =
    Number.isFinite(avgHours) && avgHours >= 0
      ? Math.round((avgHours / 3600000) * 10) / 10
      : null;

  // Distribution bars 5 -> 1, each with its share of the tenant total.
  const distributionCounts = new Map(
    (deckFacet?.distribution ?? []).map((d) => [d._id, d.count]),
  );
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = distributionCounts.get(stars) ?? 0;
    return {
      stars,
      count,
      percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    };
  });

  // Monthly trend for the last 12 calendar months (zero-filled).
  const bucketByMonth = new Map(
    (deckFacet?.trendBuckets ?? []).map((b) => [
      monthKey(b._id.year, b._id.month),
      { count: b.count, avg: round1(b.avg) },
    ]),
  );
  const trend = [];
  for (let offset = -11; offset <= 0; offset += 1) {
    const anchor = startOfMonth(offset);
    const key = monthKey(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1);
    const bucket = bucketByMonth.get(key);
    trend.push({
      key,
      year: anchor.getUTCFullYear(),
      month: anchor.getUTCMonth() + 1,
      count: bucket?.count ?? 0,
      avg: bucket?.avg ?? null,
    });
  }

  // Rating delta between the two most recent months that actually have reviews.
  const ratedMonths = trend.filter((m) => m.count > 0);
  const avgDelta =
    ratedMonths.length >= 2
      ? round1(ratedMonths[ratedMonths.length - 1].avg - ratedMonths[ratedMonths.length - 2].avg)
      : null;

  // ---------------------------------------------------------------------------
  // 2. Fleet leaderboard + vehicle filter options (resolved from real units)
  // ---------------------------------------------------------------------------
  const byVehicle = deckFacet?.byVehicle ?? [];
  const vehicleIds = byVehicle.map((v) => v._id);
  const vehicles =
    vehicleIds.length > 0
      ? await Vehicle.find({
          _id: { $in: vehicleIds },
          companyId: scope,
          deletedAt: null,
        }).select("make model year photos")
      : [];

  const vehicleById = new Map(
    vehicles.map((v) => [v._id.toString(), v]),
  );
  const leaderboard = byVehicle
    .map((row) => {
      const vehicle = vehicleById.get(row._id.toString());
      return {
        vehicle: vehicle
          ? {
              id: vehicle._id.toString(),
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year ?? null,
              photo: vehicle.photos?.[0] ?? null,
            }
          : null,
        count: row.count,
        avg: round1(row.avg),
        positivePct:
          row.count > 0 ? Math.round((row.positive / row.count) * 100) : 0,
      };
    })
    .filter((row) => row.vehicle)
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
    .map((row, index) => ({ rank: index + 1, ...row }));

  const filterVehicles = leaderboard.map(({ vehicle }) => vehicle);

  // ---------------------------------------------------------------------------
  // 3. Paginated register (spot-check valid filter inputs, then run the query)
  // ---------------------------------------------------------------------------
  const { page: safePage, limit: safeLimit, skip } = resolvePagination(
    { page, limit },
    { defaultLimit: 8 },
  );

  const listMatch = { companyId: scope };
  const starNum = Number.parseInt(star, 10);
  if (Number.isInteger(starNum) && starNum >= 1 && starNum <= 5) {
    listMatch.rating = starNum;
  }
  if (vehicleId && mongoose.isValidObjectId(vehicleId)) {
    listMatch.vehicleId = new mongoose.Types.ObjectId(vehicleId);
  }
  if (status === "responded") {
    listMatch["companyResponse.respondedAt"] = { $ne: null };
  }
  if (status === "awaiting") {
    listMatch["companyResponse.respondedAt"] = null;
  }
  const periodFromDate = periodFrom(period);
  if (periodFromDate) {
    listMatch.createdAt = { $gte: periodFromDate };
  }

  const listTotal = await Review.countDocuments(listMatch);
  const listDocs = await Review.find(listMatch)
    .sort("-createdAt")
    .skip(skip)
    .limit(safeLimit)
    .populate("vehicleId", "make model year photos")
    .populate("bookingId", "pickupLocation totalDays pickupMethod");

  const list = listDocs.map((review) => {
    const customer = review.customerId;
    const vehicle = review.vehicleId;
    const booking = review.bookingId;
    const response = review.companyResponse;
    const respondedAt = response?.respondedAt ?? null;

    return {
      id: review._id.toString(),
      rating: review.rating,
      review: review.review,
      createdAt: review.createdAt?.toISOString() ?? null,
      customer: {
        id: customer?._id?.toString() ?? null,
        initials: initialsOf(customer?.name),
        name: customer?.name ?? "Customer",
        photo: customer?.photo ?? null,
      },
      vehicle: vehicle
        ? {
            id: vehicle._id.toString(),
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year ?? null,
            photo: vehicle.photos?.[0] ?? null,
          }
        : null,
      booking: booking
        ? {
            reference: referenceOf(booking._id),
            pickupLocation: booking.pickupLocation ?? null,
            totalDays: booking.totalDays ?? null,
            pickupMethod: booking.pickupMethod ?? "BRANCH_PICKUP",
          }
        : null,
      companyResponse: {
        responded: Boolean(respondedAt),
        text: respondedAt ? response.response ?? null : null,
        respondedAt: respondedAt ? respondedAt.toISOString() : null,
      },
    };
  });

  return {
    company: { name: company.name, slug: company.slug },
    summary: {
      total,
      avg,
      verified: total,
      vehicles: distinctVehicles,
      thisMonth,
      previousMonth,
      monthChangePct,
      avgDelta,
      responded,
      awaiting: total - responded,
      responseRatePct:
        total > 0 ? Math.round((responded / total) * 100) : null,
      avgResponseHours,
    },
    distribution,
    trend,
    leaderboard,
    vehicles: filterVehicles,
    list,
    pagination: buildPaginationMeta({
      page: safePage,
      limit: safeLimit,
      total: listTotal,
    }),
  };
};