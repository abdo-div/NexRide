import mongoose from "mongoose";
import AppError from "../utils/appError.js";
import { buildPaginationMeta, resolvePagination } from "../utils/pagination.js";
import Company from "../models/Company_model.js";
import Vehicle from "../models/vehicle_model.js";
import Booking from "../models/booking_model.js";

/**
 * Vehicle detail & operations dossier for a single, tenant-scoped vehicle.
 *
 * Everything on this page is derived from real maintained ledgers — the vehicle
 * document (specs, pricing, location, listing) and the bookings ledger
 * (revenue, utilization, dispatch calendar, trip history). Metrics are computed
 * in JavaScript over the vehicle's own non-cancelled booking ledger so the
 * revenue, utilization window, calendar and trip counts all tell one story.
 */

const ON_ROAD_STATUSES = ["CONFIRMED", "ACTIVE"];
const BOOKED_STATUSES = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "ACTIVE"];
const UPCOMING_STATUSES = ["PENDING_PAYMENT", "PAID", "CONFIRMED"];
const CANCELLED_EXPIRED = ["CANCELLED", "EXPIRED"];

const ACTIVE_STATUSES = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "ACTIVE"];

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const fmtLocal = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Vehicle registry code mirrored from the fleet service. */
const vehicleCodeFrom = (id) =>
  `NR-VH-${String(id).slice(-5).toUpperCase().padStart(5, "0")}`;

const referenceOf = (id) =>
  id ? `NX-${String(id).slice(-6).toUpperCase()}` : "NX-PENDING";

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const displayPayment = (doc) => {
  if (doc.paymentStatus === "PAID") return "PAID";
  if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(doc.paymentStatus)) {
    return "REFUNDED";
  }
  const payments = doc.payments ?? [];
  const has = (s) => payments.some((p) => p?.status === s);
  const ended = CANCELLED_EXPIRED.includes(doc.bookingStatus);
  if (has("COMPLETED")) return ended ? "REFUNDED" : "PAID";
  if (has("PENDING")) return "PENDING";
  if (has("FAILED")) return "FAILED";
  return ended ? "REFUNDED" : "PENDING";
};

/** Distinct calendar days covered by a booking, clamped to [start, end]. */
const coveredDays = (booking, start, end) => {
  const from = startOfDay(new Date(Math.max(booking.startDate.getTime(), start.getTime())));
  const to = startOfDay(new Date(Math.min(booking.endDate.getTime(), end.getTime())));
  const days = [];
  for (let day = new Date(from); day <= to; day = addDays(day, 1)) {
    days.push(fmtLocal(day));
  }
  return days;
};

/**
 * Derive every operational metric from the vehicle's own booking ledger.
 * The ledger excludes cancelled/expired contract rows so revenue and trip
 * counts describe real business only.
 */
const computeLedger = ({ ledger, now, windowDays }) => {
  const windowStart = startOfDay(addDays(now, -(windowDays - 1)));
  const windowEnd = startOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const completed = ledger.filter((b) => b.bookingStatus === "COMPLETED").length;
  const upcoming = ledger.filter(
    (b) => ACTIVE_STATUSES.includes(b.bookingStatus) && b.startDate >= startOfDay(now),
  ).length;

  const onRoad = ledger.some(
    (b) =>
      ON_ROAD_STATUSES.includes(b.bookingStatus) &&
      b.startDate <= windowEnd &&
      b.endDate >= windowStart,
  );

  const bookedDaySet = new Set();
  const windowDaySet = new Set();
  ledger.forEach((b) => {
    coveredDays(b, windowStart, windowEnd).forEach((d) => windowDaySet.add(d));
    if (BOOKED_STATUSES.includes(b.bookingStatus)) {
      coveredDays(b, monthStart, monthEnd).forEach((d) => bookedDaySet.add(d));
    }
  });

  const calendar = Array.from(bookedDaySet).map((date) => {
    const booking = ledger.find(
      (b) =>
        BOOKED_STATUSES.includes(b.bookingStatus) &&
        b.startDate <= new Date(`${date}T23:59:59`) &&
        b.endDate >= new Date(`${date}T00:00:00`),
    );
    return { date, kind: booking?.bookingStatus === "PENDING_PAYMENT" ? "pending" : "booked" };
  });

  const upcomingBuddy = ledger
    .filter(
      (b) => UPCOMING_STATUSES.includes(b.bookingStatus) && b.startDate >= startOfDay(now),
    )
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0] ?? null;

  return {
    completed,
    upcoming,
    total: ledger.length,
    revenue: ledger.reduce((acc, b) => acc + (b.totalAmount ?? 0), 0),
    rentalDays: ledger.reduce((acc, b) => acc + (b.totalDays ?? 0), 0),
    utilization: {
      pct: Math.round((windowDaySet.size / windowDays) * 100),
      daysRented: windowDaySet.size,
      windowDays,
    },
    onRoad,
    calendar,
    nextDispatch: upcomingBuddy
      ? {
          id: String(upcomingBuddy._id),
          reference: referenceOf(upcomingBuddy._id),
          startDate: upcomingBuddy.startDate,
          endDate: upcomingBuddy.endDate,
          days: upcomingBuddy.totalDays,
          totalAmount: upcomingBuddy.totalAmount,
          customerName: upcomingBuddy.customerName ?? "Customer",
        }
      : null,
  };
};

/** Trip-history row mapper (the bookings pipeline shape minus the vehicle). */
const mapTripRow = (doc) => {
  const customer = doc.customer ?? {};
  return {
    id: doc._id,
    reference: referenceOf(doc._id),
    customer: {
      name: customer.name ?? "Customer",
      phone: customer.phoneNumber ?? null,
    },
    startDate: doc.startDate,
    endDate: doc.endDate,
    days: doc.totalDays,
    channel: channelOf(doc),
    service: {
      delivery: doc.pickupMethod === "DELIVERY",
      label: doc.pickupLocation,
    },
    totalAmount: doc.totalAmount,
    payment: doc.resolvedPayment,
    bookingStatus: doc.bookingStatus,
  };
};

/**
 * Full tenant + vehicle-scoped detail dossier. `vehicleId` is always validated
 * against the resolved company tenant, so a company session can never read
 * another operator's vehicle even by guessing its id.
 */
export const buildCompanyVehicleDetail = async ({ companyId, vehicleId, search, page, limit }) => {
  if (!companyId || !mongoose.isValidObjectId(companyId)) {
    throw new AppError("A valid company id is required for the vehicle dossier.", 400);
  }
  if (!mongoose.isValidObjectId(vehicleId)) {
    throw new AppError("A valid vehicle id is required for the vehicle dossier.", 400);
  }

  const company = await Company.findById(companyId).select("name slug city");
  if (!company) {
    throw new AppError("No company exists for this vehicle dossier.", 404);
  }

  const vehicle = await Vehicle.findOne({
    _id: vehicleId,
    companyId: new mongoose.Types.ObjectId(companyId),
  }).lean();

  if (!vehicle) {
    throw new AppError("This vehicle does not belong to your fleet.", 404);
  }

  const { page: currentPage, limit: pageSize, skip } = resolvePagination(
    { page, limit },
    { defaultLimit: 8, maxLimit: 50 },
  );

  const now = new Date();
  const ledger = await Booking.find({
    vehicleId: new mongoose.Types.ObjectId(vehicleId),
    companyId: new mongoose.Types.ObjectId(companyId),
    bookingStatus: { $nin: CANCELLED_EXPIRED },
  })
    .select("bookingStatus startDate endDate totalDays totalAmount")
    .lean();

  // Customer names come with the populated field on the list pipeline only; for
  // the LEDGER we look them up in the trips facet rows if needed, otherwise the
  // next-dispatch badge keeps a generic label.
  const enriched = await Booking.aggregate([
    { $match: { _id: { $in: ledger.map((b) => b._id) } } },
    { $lookup: { from: "users", localField: "customerId", foreignField: "_id", as: "customer" } },
    { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
    { $project: { _id: 1, customerName: "$customer.name" } },
  ]);
  const names = new Map(enriched.map((row) => [String(row._id), row.customerName]));
  const ledgerWithNames = ledger.map((b) => ({
    ...b,
    customerName: names.get(String(b._id)) ?? null,
  }));

  const metrics = computeLedger({
    ledger: ledgerWithNames,
    now,
    windowDays: 30,
  });

  const displayStatus = metrics.onRoad
    ? "rented"
    : vehicle.operationalStatus === "MAINTENANCE"
      ? "maintenance"
      : vehicle.listingStatus !== "PUBLISHED"
        ? "draft"
        : "available";

  // ---------------------------------------------------------------------------
  // Trip history page (searchable, paginated; scoped to this vehicle).
  // ---------------------------------------------------------------------------
  const baseMatch = {
    companyId: new mongoose.Types.ObjectId(companyId),
    vehicleId: new mongoose.Types.ObjectId(vehicleId),
  };

  const searchTerm = String(search ?? "").trim().slice(0, 80);
  const searchMatch = {};
  if (searchTerm) {
    const pattern = new RegExp(escapeRegExp(searchTerm), "i");
    const clauses = [
      { pickupLocation: pattern },
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

  const [facet] = await Booking.aggregate([
    { $match: baseMatch },
    { $lookup: { from: "users", localField: "customerId", foreignField: "_id", as: "customer" } },
    { $lookup: { from: "payments", localField: "_id", foreignField: "bookingId", as: "payments" } },
    { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        resolvedPayment: {
          $switch: {
            branches: [
              { case: { $eq: ["$paymentStatus", "PAID"] }, then: "PAID" },
              {
                case: { $in: ["$paymentStatus", ["REFUNDED", "PARTIALLY_REFUNDED"]] },
                then: "REFUNDED",
              },
              {
                case: { $gt: [{ $size: { $filter: { input: "$payments", as: "p", cond: { $eq: ["$$p.status", "COMPLETED"] } } } }, 0] },
                then: { $cond: [{ $in: ["$bookingStatus", CANCELLED_EXPIRED] }, "REFUNDED", "PAID"] },
              },
              {
                case: { $gt: [{ $size: { $filter: { input: "$payments", as: "p", cond: { $eq: ["$$p.status", "PENDING"] } } } }, 0] },
                then: "PENDING",
              },
              {
                case: { $gt: [{ $size: { $filter: { input: "$payments", as: "p", cond: { $eq: ["$$p.status", "FAILED"] } } } }, 0] },
                then: "FAILED",
              },
              { case: { $in: ["$bookingStatus", CANCELLED_EXPIRED] }, then: "REFUNDED" },
            ],
            default: "PENDING",
          },
        },
      },
    },
    ...(Object.keys(searchMatch).length > 0 ? [{ $match: searchMatch }] : []),
    { $sort: { startDate: -1, createdAt: -1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        rows: [
          { $skip: skip },
          { $limit: pageSize },
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
              customer: 1,
              payments: 1,
              resolvedPayment: 1,
            },
          },
        ],
      },
    },
  ]);

  const totalTrips = facet?.metadata?.[0]?.total ?? 0;
  const trips = (facet?.rows ?? []).map(mapTripRow);

  return {
    period: { from: null, to: null },
    company: {
      id: String(company._id),
      name: company.name,
      city: company.city ?? null,
      code: company.slug ? `#${company.slug}` : null,
    },
    vehicle: {
      id: String(vehicle._id),
      code: vehicleCodeFrom(vehicle._id),
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year ?? null,
      type: vehicle.type,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      seats: vehicle.seats ?? null,
      doors: vehicle.doors ?? null,
      dailyPrice: vehicle.dailyPrice ?? 0,
      weeklyPrice: vehicle.weeklyPrice ?? null,
      city: vehicle.city ?? null,
      pickupLocation: vehicle.pickupLocation ?? null,
      operationalStatus: vehicle.operationalStatus,
      listingStatus: vehicle.listingStatus,
      rating: {
        average: vehicle.ratingsAverage ?? null,
        count: vehicle.ratingsQuantity ?? 0,
      },
      gpsActive: Boolean(vehicle.location?.coordinates?.length === 2),
      coordinates: vehicle.location?.coordinates ?? null,
      photo: vehicle.photos?.[0] ?? null,
      photos: vehicle.photos ?? [],
      description: vehicle.description ?? null,
      createdAt: vehicle.createdAt ?? null,
      displayStatus,
    },
    metrics: {
      bookings: {
        total: metrics.total,
        completed: metrics.completed,
        upcoming: metrics.upcoming,
      },
      financial: {
        revenue: metrics.revenue,
        trips: metrics.total,
      },
      utilization: metrics.utilization,
      rentalDays: metrics.rentalDays,
      onRoad: metrics.onRoad,
    },
    calendar: {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      label: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      bookedDates: metrics.calendar,
    },
    nextDispatch: metrics.nextDispatch,
    trips: {
      list: trips,
      pagination: buildPaginationMeta({
        page: currentPage,
        limit: pageSize,
        total: totalTrips,
      }),
    },
  };
};