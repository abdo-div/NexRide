import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import Vehicle from "../models/vehicle_model.js";
import Company from "../models/Company_model.js";
import AppError from "../utils/appError.js";

/**
 * Company dashboard aggregation for a single fleet operator.
 *
 * Every figure is computed server-side from the real Booking/Payment/Vehicle
 * ledgers for ONE company tenant — the frontend only renders what it receives,
 * never a fabricated number. The `companyId` scope is fixed by the caller
 * (protect() => req.tenantId), never taken from the request body by a company
 * session, so no cross-tenant aggregation can leak a competitor's ledger
 * through a forged query parameter.
 */

const PERIOD_CONFIG = {
  "7d": { days: 7, granularity: "day", label: "7d" },
  "30d": { days: 30, granularity: "week", label: "30d" },
  "3m": { days: 90, granularity: "week", label: "3m" },
  "12m": { days: 365, granularity: "month", label: "12m" },
};

const ACTIVE_STATUSES = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "ACTIVE"];
const ON_ROAD_STATUSES = ["CONFIRMED", "ACTIVE"];

const resolvePeriod = (period) => {
  const config = PERIOD_CONFIG[period] ?? PERIOD_CONFIG["30d"];
  const now = new Date();
  const from = new Date(now.getTime() - config.days * 24 * 60 * 60 * 1000);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  return { from, to, ...config };
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const monthWindow = (offset) => {
  const from = new Date();
  from.setDate(1);
  from.setMonth(from.getMonth() + offset);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getFullYear(), from.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
};

const MONTHS_EN = [
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

const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// -----------------------------------------------------------------------------
// Bucket builders for the revenue series
// -----------------------------------------------------------------------------

const buildDailyBuckets = (from, to) => {
  const buckets = [];
  const cur = new Date(from);
  while (cur <= to) {
    const end = new Date(cur);
    end.setHours(23, 59, 59, 999);
    buckets.push({
      start: new Date(cur),
      end,
      label: `${WEEKDAYS_EN[cur.getDay()]} ${cur.getDate()}`,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return buckets;
};

const buildWeeklyBuckets = (from, to) => {
  const buckets = [];
  let cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const diffToMonday = (cur.getDay() + 6) % 7;
  cur.setDate(cur.getDate() - diffToMonday);
  while (cur < to) {
    const start = new Date(cur);
    const end = new Date(cur);
    end.setDate(end.getDate() + 7);
    const cappedEnd = end > to ? to : end;
    const label = `${MONTHS_EN[start.getMonth()]} ${start.getDate()}`;
    buckets.push({ start, end: cappedEnd, label });
    cur.setDate(cur.getDate() + 7);
  }
  return buckets;
};

const buildMonthlyBuckets = (from, to) => {
  const buckets = [];
  let cur = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cur <= to) {
    const start = new Date(cur);
    const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999);
    buckets.push({
      start,
      end: end > to ? to : end,
      label: MONTHS_EN[cur.getMonth()],
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return buckets;
};

const buildBuckets = (granularity, from, to) => {
  if (granularity === "day") return buildDailyBuckets(from, to);
  if (granularity === "month") return buildMonthlyBuckets(from, to);
  return buildWeeklyBuckets(from, to);
};

const bucketIndex = (date, buckets) =>
  buckets.findIndex((b) => date >= b.start && date <= b.end);

const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

const deltaPct = (current, previous) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

// -----------------------------------------------------------------------------
// Reference formatting (mirrors the frontend NX-XXXXXX convention)
// -----------------------------------------------------------------------------

const referenceOf = (id) =>
  id ? `NX-${String(id).slice(-6).toUpperCase()}` : "NX-PENDING";

export const buildCompanyDashboard = async ({ companyId, period } = {}) => {
  if (!companyId) {
    throw new AppError("Company tenant is required.", 400);
  }
  if (!mongoose.isValidObjectId(companyId)) {
    throw new AppError("Invalid company identifier.", 400);
  }

  const scope = { companyId: new mongoose.Types.ObjectId(companyId) };
  const { from, to, granularity, label, days } = resolvePeriod(period);
  const window = { $gte: from, $lte: to };

  // ---------------------------------------------------------------------------
  // Company profile
  // ---------------------------------------------------------------------------
  const company = await Company.findById(companyId).select(
    "name city status approvedAt customCommissionRate logo",
  );

  // ---------------------------------------------------------------------------
  // Fleet posture
  // ---------------------------------------------------------------------------
  const [fleetGroup] = await Vehicle.aggregate([
    { $match: { companyId: scope.companyId, deletedAt: null } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        available: {
          $sum: { $cond: [{ $eq: ["$operationalStatus", "AVAILABLE"] }, 1, 0] },
        },
        maintenance: {
          $sum: { $cond: [{ $eq: ["$operationalStatus", "MAINTENANCE"] }, 1, 0] },
        },
        published: {
          $sum: { $cond: [{ $eq: ["$listingStatus", "PUBLISHED"] }, 1, 0] },
        },
        avgRating: { $avg: "$ratingsAverage" },
        reviews: { $sum: "$ratingsQuantity" },
      },
    },
  ]);

  const totalVehicles = fleetGroup?.total ?? 0;
  const availableVehicles = fleetGroup?.available ?? 0;
  const maintenanceVehicles = fleetGroup?.maintenance ?? 0;

  // ---------------------------------------------------------------------------
  // On-road + upcoming (scheduled) bookings
  // ---------------------------------------------------------------------------
  const now = new Date();
  const startToday = startOfDay(now);
  const endToday = new Date(startToday);
  endToday.setHours(23, 59, 59, 999);

  const onRoadRows = await Booking.aggregate([
    {
      $match: {
        companyId: scope.companyId,
        bookingStatus: { $in: ON_ROAD_STATUSES },
        startDate: { $lte: endToday },
        endDate: { $gte: startToday },
      },
    },
    { $group: { _id: "$vehicleId" } },
  ]);
  const onRoadVehicles = onRoadRows.map((r) => String(r._id));
  const onRoadCount = onRoadRows.length;

  const upcomingRows = await Booking.aggregate([
    {
      $match: {
        companyId: scope.companyId,
        bookingStatus: { $in: ACTIVE_STATUSES },
        startDate: { $gte: startToday },
      },
    },
    { $group: { _id: "$vehicleId" } },
  ]);
  const upcomingVehicleIds = upcomingRows.map((r) => String(r._id));
  const upcomingCount = upcomingRows.length;

  const onRoadSet = new Set(onRoadVehicles);
  const scheduledVehicles = upcomingVehicleIds.filter(
    (id) => !onRoadSet.has(id),
  ).length;

  const fleet = {
    total: totalVehicles,
    available: Math.max(0, totalVehicles - onRoadCount - maintenanceVehicles - scheduledVehicles),
    onRoad: onRoadCount,
    maintenance: maintenanceVehicles,
    scheduled: scheduledVehicles,
    published: fleetGroup?.published ?? 0,
    utilizationPct: Number(
      (totalVehicles > 0 ? ((totalVehicles - scheduledVehicles) / totalVehicles) * 100 : 0).toFixed(1),
    ),
  };

  // ---------------------------------------------------------------------------
  // Financial surface — COMPLETED payments for the active window
  // ---------------------------------------------------------------------------
  const [fin] = await Payment.aggregate([
    { $match: { companyId: scope.companyId, status: "COMPLETED", createdAt: window } },
    {
      $group: {
        _id: null,
        gross: { $sum: "$amount" },
        cut: { $sum: "$commissionAmount" },
        net: { $sum: "$companyShare" },
        tx: { $sum: 1 },
      },
    },
  ]);

  const gross = fin?.gross ?? 0;
  const cut = fin?.cut ?? 0;
  const net = fin?.net ?? 0;
  const tx = fin?.tx ?? 0;

  const [pendingRow] = await Payment.aggregate([
    {
      $match: {
        companyId: scope.companyId,
        status: "COMPLETED",
        payoutStatus: { $in: ["UNSETTLED", "PROCESSING"] },
      },
    },
    {
      $group: {
        _id: null,
        pending: { $sum: "$companyShare" },
        count: { $sum: 1 },
      },
    },
  ]);

  const pendingPayout = pendingRow?.pending ?? 0;
  const pendingPayoutCount = pendingRow?.count ?? 0;

  // ---------------------------------------------------------------------------
  // Revenue series (gross vs net per bucket)
  // ---------------------------------------------------------------------------
  const paymentRows = await Payment.aggregate([
    {
      $match: { companyId: scope.companyId, status: "COMPLETED", createdAt: window },
    },
    { $project: { paidAt: 1, createdAt: 1, amount: 1, companyShare: 1 } },
  ]);

  const buckets = buildBuckets(granularity, from, to);
  const series = buckets.map((b) => ({ label: b.label, gross: 0, net: 0, tx: 0 }));
  paymentRows.forEach((p) => {
    const anchor = p.paidAt || p.createdAt;
    if (!anchor) return;
    const idx = bucketIndex(new Date(anchor), buckets);
    if (idx < 0) return;
    series[idx].gross += p.amount;
    series[idx].net += p.companyShare;
    series[idx].tx += 1;
  });

  // ---------------------------------------------------------------------------
  // This-month vs last-month revenue (calendar months)
  // ---------------------------------------------------------------------------
  const thisMonth = monthWindow(0);
  const prevMonth = monthWindow(-1);
  const [monthFin] = await Payment.aggregate([
    {
      $match: {
        companyId: scope.companyId,
        status: "COMPLETED",
        createdAt: { $gte: thisMonth.from, $lte: thisMonth.to },
      },
    },
    {
      $group: {
        _id: null,
        gross: { $sum: "$amount" },
        net: { $sum: "$companyShare" },
        tx: { $sum: 1 },
      },
    },
  ]);
  const [prevMonthFin] = await Payment.aggregate([
    {
      $match: {
        companyId: scope.companyId,
        status: "COMPLETED",
        createdAt: { $gte: prevMonth.from, $lte: prevMonth.to },
      },
    },
    { $group: { _id: null, gross: { $sum: "$amount" }, tx: { $sum: 1 } } },
  ]);

  const revenueGross = monthFin?.gross ?? 0;
  const revenueNet = monthFin?.net ?? 0;
  const revenueDeltaPct = deltaPct(revenueGross, prevMonthFin?.gross ?? 0);

  // ---------------------------------------------------------------------------
  // Upcoming bookings & dispatches (next 5, soonest first)
  // ---------------------------------------------------------------------------
  const upcoming = await Booking.find({
    companyId: scope.companyId,
    bookingStatus: { $in: ["PENDING_PAYMENT", "PAID", "CONFIRMED", "ACTIVE"] },
    startDate: { $gte: startToday },
  })
    .sort({ startDate: 1 })
    .limit(5)
    .populate("vehicleId", "make model year photos")
    .populate("customerId", "name");

  const upcomingBookings = upcoming.map((booking) => {
    const vehicle = booking.vehicleId;
    const customer = booking.customerId;
    return {
      id: booking.id,
      reference: referenceOf(booking.id),
      vehicleMake: vehicle?.make ?? "",
      vehicleModel: vehicle?.model ?? "",
      vehicleYear: vehicle?.year ?? null,
      photo: vehicle?.photos?.[0] ?? null,
      customerName: customer?.name ?? "Customer",
      pickupLocation: booking.pickupLocation,
      pickupMethod: booking.pickupMethod,
      startDate: booking.startDate,
      endDate: booking.endDate,
      totalAmount: booking.totalAmount,
      companyShare: booking.companyShare,
      bookingStatus: booking.bookingStatus,
    };
  });

  // ---------------------------------------------------------------------------
  // Recent activity (payments / new bookings / fleet additions)
  // ---------------------------------------------------------------------------
  const [recentPayments, recentBookings, recentVehicles] = await Promise.all([
    Payment.find({ companyId: scope.companyId, status: "COMPLETED" })
      .sort({ paidAt: -1, createdAt: -1 })
      .limit(3)
      .select("amount paidAt createdAt bookingId"),
    Booking.find({ companyId: scope.companyId, createdAt: { $gte: startToday } })
      .sort({ createdAt: -1 })
      .limit(2)
      .select("createdAt totalAmount pickupLocation")
      .populate("customerId", "name"),
    Vehicle.find({ companyId: scope.companyId, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(2)
      .select("make model year createdAt listingStatus"),
  ]);

  const activity = [];
  recentPayments.forEach((p) => {
    activity.push({
      id: `payment-${p.id}`,
      kind: "payment",
      title: "Payment settled",
      detail: referenceOf(p.bookingId),
      meta: p.amount,
      at: p.paidAt || p.createdAt,
    });
  });
  recentBookings.forEach((b) => {
    activity.push({
      id: `booking-${b.id}`,
      kind: "booking",
      title: "New booking received",
      detail: b.pickupLocation ?? "Branch pickup",
      meta: b.totalAmount,
      at: b.createdAt,
    });
  });
  recentVehicles.forEach((v) => {
    activity.push({
      id: `vehicle-${v.id}`,
      kind: "vehicle",
      title: `${v.make ?? ""} ${v.model ?? ""}`.trim() || "Vehicle listed",
      detail: v.year ? String(v.year) : "fleet addition",
      meta: v.listingStatus,
      at: v.createdAt,
    });
  });
  activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  // ---------------------------------------------------------------------------
  // Monthly performance (calendar month, vs previous)
  // ---------------------------------------------------------------------------
  const [
    monthBookings,
    prevMonthBookings,
    monthFunnel,
  ] = await Promise.all([
    Booking.countDocuments({
      companyId: scope.companyId,
      createdAt: { $gte: thisMonth.from, $lte: thisMonth.to },
    }),
    Booking.countDocuments({
      companyId: scope.companyId,
      createdAt: { $gte: prevMonth.from, $lte: prevMonth.to },
    }),
    Booking.aggregate([
      {
        $match: {
          companyId: scope.companyId,
          createdAt: { $gte: thisMonth.from, $lte: thisMonth.to },
        },
      },
      {
        $group: {
          _id: "$bookingStatus",
          amount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const funnelMap = new Map(monthFunnel.map((r) => [r._id, r]));
  const totalMonthBookings = monthFunnel.reduce((acc, r) => acc + r.count, 0);
  const completedCount = funnelMap.get("COMPLETED")?.count ?? 0;
  const fulfilledCount =
    (funnelMap.get("COMPLETED")?.count ?? 0) +
    (funnelMap.get("ACTIVE")?.count ?? 0) +
    (funnelMap.get("CONFIRMED")?.count ?? 0);
  const cancelledCount =
    (funnelMap.get("CANCELLED")?.count ?? 0) +
    (funnelMap.get("EXPIRED")?.count ?? 0);
  const monthAmount = monthFunnel.reduce((acc, r) => acc + r.amount, 0);

  const avgRating =
    (fleetGroup?.reviews ?? 0) > 0 && fleetGroup.avgRating
      ? Number(fleetGroup.avgRating.toFixed(2))
      : 0;

  return {
    period: { from, to, label },
    company: company
      ? {
          id: company.id,
          name: company.name,
          city: company.city,
          status: company.status,
          approvedAt: company.approvedAt ?? null,
          commissionRate: company.customCommissionRate ?? null,
        }
      : null,
    kpis: {
      totalVehicles,
      totalPublished: fleetGroup?.published ?? 0,
      onRoad: onRoadCount,
      upcoming: upcomingCount,
      pendingPayout,
      pendingPayoutCount,
      revenueGross,
      revenueNet,
      revenueDeltaPct,
    },
    revenueSeries: series,
    financial: {
      gross,
      cut,
      net,
      tx,
      avgTicket: tx > 0 ? gross / tx : 0,
      takeRatePct: Number(pct(cut, gross).toFixed(1)),
      avgDailyEarning:
        days > 0 ? Number((net / days).toFixed(2)) : 0,
      periodDays: days,
    },
    fleet,
    upcomingBookings,
    activity: activity.slice(0, 6),
    performance: {
      bookingsThisMonth: monthBookings,
      bookingsPrevMonth: prevMonthBookings,
      bookingsDeltaPct: deltaPct(monthBookings, prevMonthBookings),
      fulfillmentRate: Number(
        pct(fulfilledCount, totalMonthBookings).toFixed(1),
      ),
      cancellationRate: Number(
        pct(cancelledCount, totalMonthBookings).toFixed(1),
      ),
      avgBookingValue: totalMonthBookings > 0 ? monthAmount / totalMonthBookings : 0,
      completedCount,
      avgRating,
      reviews: fleetGroup?.reviews ?? 0,
    },
  };
};