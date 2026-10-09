import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import Company from "../models/Company_model.js";
import Vehicle from "../models/vehicle_model.js";

/**
 * Live Reports & Analytics aggregation for the admin surface. Every figure is
 * computed from the real Booking/Payment/Vehicle/Company collections within the
 * requested window — nothing is fabricated client-side. The window and optional
 * hub scope are resolved here so the frontend only renders what it gets.
 */

const PERIOD_DAYS = {
  "7d": 7,
  "30d": 30,
  "3m": 90,
  "6m": 180,
};

const resolvePeriod = (period) => {
  const key = period || "month";
  const now = new Date();
  let from;
  if (key === "ytd") {
    from = new Date(now.getFullYear(), 0, 1);
  } else if (key === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    const days = PERIOD_DAYS[key] ?? 30;
    from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  return { from, to, label: key };
};

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * When a hub is selected, resolve the operator and vehicle ids that belong to
 * that city so every pipeline can be scoped consistently. `null` means "no hub
 * filter" (all hubs).
 */
const resolveHubScope = async (hub) => {
  if (!hub || hub === "all") {
    return { companyIds: null, vehicleIds: null };
  }
  const re = new RegExp(`^${escapeRegex(hub)}$`, "i");
  const [companies, vehicles] = await Promise.all([
    Company.find({ city: re }).select("_id"),
    Vehicle.find({ city: re }).select("_id"),
  ]);
  return {
    companyIds: companies.map((d) => d._id),
    vehicleIds: vehicles.map((d) => d._id),
  };
};

/**
 * Scope matcher for collections that carry both companyId and vehicleId
 * (Bookings). A booking is included when either its operator or its vehicle
 * lives in the selected hub.
 */
const bookingScope = ({ companyIds, vehicleIds }) => {
  const parts = [];
  if (companyIds && companyIds.length > 0) {
    parts.push({ companyId: { $in: companyIds } });
  }
  if (vehicleIds && vehicleIds.length > 0) {
    parts.push({ vehicleId: { $in: vehicleIds } });
  }
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { $or: parts };
};

/** Scope matcher for company-only documents (Payments). */
const companyScope = ({ companyIds }) =>
  companyIds && companyIds.length > 0
    ? { companyId: { $in: companyIds } }
    : {};

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

const buildWeekBuckets = (from, to) => {
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
    const startDateNum = start.getDate();
    const endDateNum = end > to ? to.getDate() : end.getDate();
    const label =
      start.getMonth() === (end > to ? to.getMonth() : end.getMonth())
        ? `${MONTHS_EN[start.getMonth()]} ${startDateNum}\u2013${endDateNum}`
        : `${MONTHS_EN[start.getMonth()]} ${startDateNum}\u2013${
            MONTHS_EN[to.getMonth()]
          } ${endDateNum}`;
    buckets.push({ start, end: cappedEnd, label });
    cur.setDate(cur.getDate() + 7);
  }
  return buckets;
};

const weekOf = (date, buckets) =>
  buckets.find((b) => date >= b.start && date <= b.end);

const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

export const buildAnalyticsSummary = async ({ period, hub } = {}) => {
  const { from, to, label } = resolvePeriod(period);
  const scope = await resolveHubScope(hub);
  const scopeB = bookingScope(scope);
  const scopeP = companyScope(scope);

  const windowB = { $and: [{ createdAt: { $gte: from, $lte: to } }, scopeB] };
  const windowP = { $and: [{ createdAt: { $gte: from, $lte: to } }, scopeP] };

  // -------------------------------------------------------------------------
  // Fleet posture + partner registry
  // -------------------------------------------------------------------------
  const vehicleMatch =
    scope.vehicleIds && scope.vehicleIds.length > 0
      ? { _id: { $in: scope.vehicleIds } }
      : {};
  const [fleet] = await Vehicle.aggregate([
    { $match: vehicleMatch },
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
        unavailable: {
          $sum: { $cond: [{ $eq: ["$operationalStatus", "SUSPENDED"] }, 1, 0] },
        },
        published: {
          $sum: { $cond: [{ $eq: ["$listingStatus", "PUBLISHED"] }, 1, 0] },
        },
      },
    },
  ]);

  const fleetSize = fleet?.total ?? 0;
  const partnersBase = scope.companyIds
    ? { _id: { $in: scope.companyIds } }
    : {};
  const [partnerStats] = await Company.aggregate([
    { $match: partnersBase },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        approved: {
          $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] },
        },
      },
    },
  ]);

  // -------------------------------------------------------------------------
  // Booking funnel inside the window
  // -------------------------------------------------------------------------
  const bookingRows = await Booking.aggregate([
    { $match: windowB },
    {
      $group: {
        _id: "$bookingStatus",
        count: { $sum: 1 },
        totalDays: { $sum: "$totalDays" },
        sumAmount: { $sum: "$totalAmount" },
      },
    },
  ]);
  const statusMap = {};
  bookingRows.forEach((r) => {
    statusMap[r._id] = r;
  });
  const totalBookings = bookingRows.reduce((acc, r) => acc + r.count, 0);
  const countOf = (key) => (statusMap[key]?.count ?? 0);
  const completed = countOf("COMPLETED");
  const activeOnRoad = countOf("ACTIVE") + countOf("CONFIRMED");
  const cancelled = countOf("CANCELLED") + countOf("EXPIRED");
  const pending = countOf("PENDING_PAYMENT") + countOf("PAID");

  // Peak booking day
  const [peakDay] = await Booking.aggregate([
    { $match: windowB },
    {
      $project: {
        day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      },
    },
    { $group: { _id: "$day", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 },
  ]);

  // -------------------------------------------------------------------------
  // Financial surface — settled payments within the window
  // -------------------------------------------------------------------------
  const [fin] = await Payment.aggregate([
    { $match: { status: "COMPLETED", ...windowP } },
    {
      $group: {
        _id: null,
        gross: { $sum: "$amount" },
        cut: { $sum: "$commissionAmount" },
        net: { $sum: "$companyShare" },
        tx: { $sum: 1 },
        settledShare: {
          $sum: {
            $cond: [{ $eq: ["$payoutStatus", "SETTLED"] }, "$companyShare", 0],
          },
        },
        pendingShare: {
          $sum: {
            $cond: [
              { $in: ["$payoutStatus", ["UNSETTLED", "PROCESSING"]] },
              "$companyShare",
              0,
            ],
          },
        },
        customers: { $addToSet: "$customerId" },
      },
    },
  ]);
  const [refunds] = await Payment.aggregate([
    { $match: { status: "REFUNDED", ...windowP } },
    { $group: { _id: null, amount: { $sum: "$amount" }, tx: { $sum: 1 } } },
  ]);

  const gross = fin?.gross ?? 0;
  const cut = fin?.cut ?? 0;
  const takeRate = pct(cut, gross);
  const avgTicket = (fin?.tx ?? 0) > 0 ? gross / fin.tx : 0;

  // Weekly GMV + commission buckets (Mon-based) within the window
  const weeklyPayments = await Payment.aggregate([
    { $match: { status: "COMPLETED", ...windowP } },
    { $project: { paidAt: 1, createdAt: 1, amount: 1, commissionAmount: 1 } },
  ]);
  const buckets = buildWeekBuckets(from, to);
  const weekly = buckets.map((b) => ({ ...b, gross: 0, cut: 0, tx: 0 }));
  const dowTotals = {};
  weeklyPayments.forEach((p) => {
    const anchor = p.paidAt || p.createdAt;
    const bucket = weekOf(anchor, buckets);
    if (bucket) {
      const idx = buckets.indexOf(bucket);
      weekly[idx].gross += p.amount;
      weekly[idx].cut += p.commissionAmount;
      weekly[idx].tx += 1;
    }
    const dow = anchor.getDay();
    dowTotals[dow] = (dowTotals[dow] ?? 0) + p.amount;
  });
  const weekdaySeries = WEEKDAYS_EN.map((name, idx) => ({
    day: name,
    gross: dowTotals[idx] ?? 0,
  }));

  // -------------------------------------------------------------------------
  // Renter cohort + retention
  // -------------------------------------------------------------------------
  const activeRenters = await Booking.aggregate([
    { $match: windowB },
    { $group: { _id: "$customerId" } },
  ]);
  const activeRenterIds = new Set(
    activeRenters.map((r) => (r._id ? r._id.toString() : null)).filter(Boolean),
  );
  const activeRenterCount = activeRenterIds.size;

  const firstBookings = await Booking.aggregate([
    { $match: scopeB },
    { $group: { _id: "$customerId", first: { $min: "$createdAt" } } },
  ]);
  const newRenters = firstBookings.filter(
    (r) =>
      r._id &&
      activeRenterIds.has(r._id.toString()) &&
      r.first >= from,
  ).length;
  const returningRenters = Math.max(0, activeRenterCount - newRenters);

  const repeatRows = await Booking.aggregate([
    {
      $match: {
        ...windowB,
        bookingStatus: { $in: ["COMPLETED", "ACTIVE", "CONFIRMED"] },
      },
    },
    { $group: { _id: "$customerId", trips: { $sum: 1 } } },
    { $match: { trips: { $gte: 3 } } },
  ]);

  const [lifetime] = await Payment.aggregate([
    { $match: { status: "COMPLETED", ...windowP } },
    {
      $group: {
        _id: null,
        gross: { $sum: "$amount" },
        customers: { $addToSet: "$customerId" },
      },
    },
  ]);
  const ltv =
    (lifetime?.customers?.length ?? 0) > 0
      ? (lifetime?.gross ?? 0) / lifetime.customers.length
      : 0;

  const [topRenter] = await Payment.aggregate([
    { $match: { status: "COMPLETED", ...windowP } },
    {
      $group: {
        _id: "$customerId",
        spend: { $sum: "$amount" },
        trips: { $sum: 1 },
      },
    },
    { $sort: { spend: -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: "$user.name",
        spend: 1,
        trips: 1,
      },
    },
  ]);

  // -------------------------------------------------------------------------
  // Top performing rental companies
  // -------------------------------------------------------------------------
  const companyPayments = await Payment.aggregate([
    { $match: { status: "COMPLETED", ...windowP } },
    {
      $group: {
        _id: "$companyId",
        bookings: { $sum: 1 },
        gross: { $sum: "$amount" },
        cut: { $sum: "$commissionAmount" },
      },
    },
    { $sort: { gross: -1 } },
    { $limit: 8 },
    {
      $lookup: {
        from: "companies",
        localField: "_id",
        foreignField: "_id",
        as: "company",
      },
    },
    { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        name: "$company.name",
        city: "$company.city",
        status: "$company.status",
        bookings: 1,
        gross: 1,
        cut: 1,
      },
    },
  ]);
  const companyBookingStats = await Booking.aggregate([
    { $match: windowB },
    {
      $group: {
        _id: "$companyId",
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$bookingStatus", "COMPLETED"] }, 1, 0] },
        },
        activeNow: {
          $sum: {
            $cond: [{ $in: ["$bookingStatus", ["ACTIVE", "CONFIRMED"]] }, 1, 0],
          },
        },
      },
    },
  ]);
  const compStatsMap = {};
  companyBookingStats.forEach((r) => {
    if (r._id) compStatsMap[r._id.toString()] = r;
  });
  const topCompanies = companyPayments
    .filter((row) => row._id)
    .map((row, idx) => {
      const stats =
        compStatsMap[row._id.toString()] ?? {
          total: 0,
          completed: 0,
          activeNow: 0,
        };
      return {
        rank: idx + 1,
        _id: row._id,
        name: row.name ?? `Partner ${row._id}`,
        city: row.city ?? "",
        status: row.status ?? "PENDING",
        bookings: row.bookings,
        gross: row.gross,
        cut: row.cut,
        avgTicket: row.bookings > 0 ? row.gross / row.bookings : 0,
        completed: stats.completed,
        completionPct: pct(stats.completed, stats.total),
        activeNow: stats.activeNow,
      };
    });

  // -------------------------------------------------------------------------
  // Top performing vehicles
  // -------------------------------------------------------------------------
  const periodDays = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
  const topVehicles = await Booking.aggregate([
    {
      $match: {
        ...windowB,
        bookingStatus: { $in: ["COMPLETED", "ACTIVE", "CONFIRMED"] },
      },
    },
    {
      $group: {
        _id: "$vehicleId",
        bookings: { $sum: 1 },
        rentalDays: { $sum: "$totalDays" },
        revenue: { $sum: "$totalAmount" },
        avgRate: { $avg: "$dailyRate" },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 8 },
    {
      $lookup: {
        from: "vehicles",
        localField: "_id",
        foreignField: "_id",
        as: "vehicle",
      },
    },
    { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "companies",
        localField: "vehicle.companyId",
        foreignField: "_id",
        as: "operator",
      },
    },
    { $unwind: { path: "$operator", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        vehicle: {
          _id: "$vehicle._id",
          make: "$vehicle.make",
          model: "$vehicle.model",
          year: "$vehicle.year",
          type: "$vehicle.type",
          transmission: "$vehicle.transmission",
          fuelType: "$vehicle.fuelType",
          dailyPrice: "$vehicle.dailyPrice",
          photoUrl: { $arrayElemAt: ["$vehicle.photos", 0] },
        },
        operator: { _id: "$operator._id", name: "$operator.name", city: "$operator.city" },
        bookings: 1,
        rentalDays: 1,
        revenue: 1,
        avgRate: 1,
      },
    },
  ]);
  const topVehicleRows = topVehicles
    .filter((row) => row._id && row.vehicle && row.vehicle._id)
    .map((row, idx) => ({
      rank: idx + 1,
      ...row,
      utilizationPct: Math.min(100, pct(row.rentalDays, periodDays)),
    }));

  // -------------------------------------------------------------------------
  // Live fleet deployment (vehicles on road right now)
  // -------------------------------------------------------------------------
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const deployedRows = await Booking.aggregate([
    {
      $match: {
        ...scopeB,
        bookingStatus: { $in: ["CONFIRMED", "ACTIVE"] },
        startDate: { $lte: endOfToday },
        endDate: { $gte: startOfToday },
      },
    },
    { $group: { _id: "$vehicleId" } },
  ]);
  const deployedToday = deployedRows.length;

  // -------------------------------------------------------------------------
  // Previous-window comparison (identical length) for honest deltas
  // -------------------------------------------------------------------------
  const windowLength = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - windowLength);
  const prevTo = new Date(from.getTime() - 1);
  const [prevFin] = await Payment.aggregate([
    {
      $match: { status: "COMPLETED", createdAt: { $gte: prevFrom, $lte: prevTo } },
    },
    { $group: { _id: null, gross: { $sum: "$amount" }, cut: { $sum: "$commissionAmount" } } },
  ]);
  const [prevBookings] = await Booking.aggregate([
    {
      $match: { ...scopeB, createdAt: { $gte: prevFrom, $lte: prevTo } },
    },
    { $group: { _id: null, count: { $sum: 1 } } },
  ]);
  const delta = (cur, prev) => (prev > 0 ? (cur - prev) / prev : null);
  const comparison = {
    grossDeltaPct: delta(gross, prevFin?.gross ?? 0),
    cutDeltaPct: delta(cut, prevFin?.cut ?? 0),
    bookingsDeltaPct: delta(totalBookings, prevBookings?.count ?? 0),
  };

  const clearingHealthPct = pct(
    fin?.settledShare ?? 0,
    (fin?.settledShare ?? 0) + (fin?.pendingShare ?? 0),
  );
  const now = new Date();
  const clearingBatchRef = `CLG-${now.getUTCFullYear()}-${String(
    now.getUTCMonth() + 1,
  ).padStart(2, "0")}`;

  return {
    period: { from, to, label },
    fleet: {
      size: fleetSize,
      available: fleet?.available ?? 0,
      maintenance: fleet?.maintenance ?? 0,
      unavailable: fleet?.unavailable ?? 0,
      published: fleet?.published ?? 0,
      deployedToday,
      utilizationPct: Math.min(
        100,
        pct(
          bookingRows.reduce((acc, r) => acc + (r.totalDays || 0), 0),
          fleetSize * periodDays,
        ),
      ),
    },
    partners: {
      total: partnerStats?.total ?? 0,
      approved: partnerStats?.approved ?? 0,
      certifiedPct: pct(partnerStats?.approved ?? 0, partnerStats?.total ?? 0),
    },
    funnel: {
      total: totalBookings,
      completed,
      activeOnRoad,
      cancelled,
      pending,
      completionPct: pct(completed + activeOnRoad, totalBookings),
      churnPct: pct(cancelled, totalBookings),
      peakDay: peakDay
        ? { day: peakDay._id, count: peakDay.count }
        : null,
    },
    financial: {
      gross,
      cut,
      net: fin?.net ?? 0,
      takeRate,
      avgTicket,
      tx: fin?.tx ?? 0,
      refunds: { amount: refunds?.amount ?? 0, tx: refunds?.tx ?? 0 },
    },
    weekly,
    weekdaySeries,
    clearing: {
      settledShare: fin?.settledShare ?? 0,
      pendingShare: fin?.pendingShare ?? 0,
      healthPct: clearingHealthPct,
      batchRef: clearingBatchRef,
    },
    renters: {
      active: activeRenterCount,
      new: newRenters,
      returning: returningRenters,
      retentionPct: pct(returningRenters, activeRenterCount),
      avgSpendPerClient: activeRenterCount > 0 ? gross / activeRenterCount : 0,
      ltv,
      repeatRenters: repeatRows.length,
      topRenter: topRenter
        ? { name: topRenter.name ?? "Customer", spend: topRenter.spend, trips: topRenter.trips }
        : null,
    },
    comparison,
    topCompanies,
    topVehicles: topVehicleRows,
  };
};
