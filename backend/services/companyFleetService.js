import mongoose from "mongoose";
import AppError from "../utils/appError.js";
import { buildPaginationMeta, resolvePagination } from "../utils/pagination.js";
import Company from "../models/Company_model.js";
import Vehicle from "../models/vehicle_model.js";
import Booking from "../models/booking_model.js";

/**
 * Statuses that put a vehicle physically on the road right now (rental in
 * progress) and the active-window used to detect "overlapping today". Kept in
 * lock-step with companyDashboardService so the fleet page and the dashboard's
 * fleet panel always tell the same story.
 */
const ON_ROAD_STATUSES = ["CONFIRMED", "ACTIVE"];

/** Design-derived fleet display states (one bucket per vehicle, summing to total). */
const DISPLAY_STATES = ["rented", "maintenance", "draft", "available"];

const MAX_SEARCH_LENGTH = 80;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Filter -> backend field maps for the design's filter pills. */
const CATEGORY_TYPES = {
  sedan: ["SEDAN"],
  suv: ["SUV"],
  luxury: ["LUXURY"],
  commercial: ["VAN", "PICKUP"],
};
const TRANSMISSION_MAP = {
  automatic: "AUTOMATIC",
  manual: "MANUAL",
};
const FUEL_MAP = {
  petrol: "GASOLINE",
  hybrid: "HYBRID",
  diesel: "DIESEL",
  electric: "ELECTRIC",
};

const safeRegex = (value) => {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
};

/** Vehicle registry code from the real id, e.g. NR-VH-A01BC. */
export const vehicleCodeFrom = (id) =>
  `NR-VH-${String(id).slice(-5).toUpperCase().padStart(5, "0")}`;

const buildBasePipeline = ({ companyId, search, category, transmission, fuel, city }) => {
  const match = { companyId, deletedAt: null };

  if (category && CATEGORY_TYPES[category]) {
    match.type = { $in: CATEGORY_TYPES[category] };
  } else if (category) {
    throw new AppError("Unknown fleet category filter.", 400);
  }

  if (transmission && TRANSMISSION_MAP[transmission]) {
    match.transmission = TRANSMISSION_MAP[transmission];
  } else if (transmission) {
    throw new AppError("Unknown transmission filter.", 400);
  }

  if (fuel && FUEL_MAP[fuel]) {
    match.fuelType = FUEL_MAP[fuel];
  } else if (fuel) {
    throw new AppError("Unknown fuel filter.", 400);
  }

  if (city) {
    match.city = safeRegex(city);
  }

  const pipeline = [{ $match: match }];

  // Free-text search: make / model / pickup address / city (+ registry code).
  if (search) {
    const term = String(search).slice(0, MAX_SEARCH_LENGTH);
    const codeTerm = term.startsWith("NR-") ? term.slice(5) : term;
    const searchMatch = {
      $or: [
        { make: safeRegex(term) },
        { model: safeRegex(term) },
        { pickupLocation: safeRegex(term) },
        { city: safeRegex(term) },
      ],
    };
    if (mongoose.isValidObjectId(term)) {
      searchMatch.$or.push({ _id: mongoose.Types.ObjectId.createFromHexString(term) });
    }
    if (codeTerm) {
      searchMatch.$or.push({
        $expr: {
          $regexMatch: {
            input: { $toUpper: { $substrCP: [{ $toString: "$_id" }, -5, 5] } },
            regex: safeRegex(codeTerm),
          },
        },
      });
    }
    pipeline.push({ $match: searchMatch });
  }

  return pipeline;
};

const buildOnRoadSet = async ({ companyId, start, end }) => {
  const rows = await Booking.aggregate([
    {
      $match: {
        companyId,
        bookingStatus: { $in: ON_ROAD_STATUSES },
        startDate: { $lte: end },
        endDate: { $gte: start },
      },
    },
    { $group: { _id: "$vehicleId" } },
  ]);
  return new Set(rows.map((row) => String(row._id)));
};

const ON_ROAD_CLASS = {
  $cond: [
    "$_onRoad",
    "rented",
    {
      $switch: {
        branches: [
          { case: { $eq: ["$operationalStatus", "MAINTENANCE"] }, then: "maintenance" },
          { case: { $ne: ["$listingStatus", "PUBLISHED"] }, then: "draft" },
        ],
        default: "available",
      },
    },
  ],
};

const vehicleClassField = (onRoadIdStrings) => ({
  _onRoad: {
    $in: ["$_id", { $literal: onRoadIdStrings.map((id) => mongoose.Types.ObjectId.createFromHexString(id)) }],
  },
});

/**
 * Tenant-scoped fleet register for a single fleet operator.
 *
 * `summary` holds the five fleet-posture cards (total / available / rented /
 * maintenance / draft). Each vehicle is classified into exactly one display
 * state (rented > maintenance > draft > available) so the deck, the filters and
 * the per-row pills all stay mutually consistent. `list` is the filtered,
 * paginated register with real pricing, hub and completed-rides data.
 */
export const buildCompanyFleet = async ({ companyId, search, status, category, transmission, fuel, city, page, limit }) => {
  if (!companyId || !mongoose.isValidObjectId(companyId)) {
    throw new AppError("A valid company id is required for the fleet register.", 400);
  }

  const company = await Company.findById(companyId).select("name slug city");
  if (!company) {
    throw new AppError("No company exists for this fleet register.", 404);
  }

  const { page: currentPage, limit: pageSize, skip } = resolvePagination(
    { page, limit },
    { defaultLimit: 7, maxLimit: 50 },
  );

  const now = new Date();
  const startToday = startOfDay(now);
  const endToday = new Date(startToday);
  endToday.setHours(23, 59, 59, 999);
  const onRoadSet = await buildOnRoadSet({ companyId, start: startToday, end: endToday });
  const onRoadIds = Array.from(onRoadSet);

  // ---------------------------------------------------------------------------
  // Summary — whole fleet posture (no list filters), one bucket per vehicle.
  // ---------------------------------------------------------------------------
  const [deckGroup] = await Vehicle.aggregate([
    { $match: { companyId, deletedAt: null } },
    { $addFields: vehicleClassField(onRoadIds) },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        rented: { $sum: { $cond: ["$_onRoad", 1, 0] } },
        maintenance: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ["$operationalStatus", "MAINTENANCE"] }, { $ne: ["$_onRoad", true] }] },
              1,
              0,
            ],
          },
        },
        draft: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$listingStatus", "PUBLISHED"] },
                  { $ne: ["$_onRoad", true] },
                  { $ne: ["$operationalStatus", "MAINTENANCE"] },
                ],
              },
              1,
              0,
            ],
          },
        },
        published: { $sum: { $cond: [{ $eq: ["$listingStatus", "PUBLISHED"] }, 1, 0] } },
      },
    },
  ]);

  const total = deckGroup?.total ?? 0;
  const rented = deckGroup?.rented ?? 0;
  const maintenance = deckGroup?.maintenance ?? 0;
  const draft = deckGroup?.draft ?? 0;
  const available = Math.max(0, total - rented - maintenance - draft);

  // ---------------------------------------------------------------------------
  // Paginated list (filters apply), classified with the same priority ladder.
  // ---------------------------------------------------------------------------
  const pipeline = buildBasePipeline({ companyId, search, category, transmission, fuel, city });
  pipeline.push({ $addFields: vehicleClassField(onRoadIds) });

  if (status) {
    if (!DISPLAY_STATES.includes(status)) {
      throw new AppError("Unknown fleet status filter.", 400);
    }
    pipeline.push({ $match: { $expr: { $eq: [{ $literal: status }, ON_ROAD_CLASS] } } });
  }

  pipeline.push({
    $facet: {
      count: [{ $count: "total" }],
      rows: [
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: pageSize },
      ],
    },
  });

  const [faceted] = await Vehicle.aggregate(pipeline);
  const rows = faceted?.rows ?? [];
  const filteredTotal = faceted?.count?.[0]?.total ?? 0;

  // ---------------------------------------------------------------------------
  // Completed-rides tallies for the visible page only.
  // ---------------------------------------------------------------------------
  const pageIds = rows.map((row) => row._id);
  const ridesByVehicle = new Map();
  if (pageIds.length > 0) {
    const rideRows = await Booking.aggregate([
      { $match: { vehicleId: { $in: pageIds }, bookingStatus: "COMPLETED" } },
      { $group: { _id: "$vehicleId", rides: { $sum: 1 } } },
    ]);
    rideRows.forEach((row) => ridesByVehicle.set(String(row._id), row.rides));
  }

  const vehicleToRow = (vehicle) => ({
    id: String(vehicle._id),
    code: vehicleCodeFrom(vehicle._id),
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year ?? null,
    type: vehicle.type,
    displayStatus: vehicle._onRoad
      ? "rented"
      : vehicle.operationalStatus === "MAINTENANCE"
        ? "maintenance"
        : vehicle.listingStatus !== "PUBLISHED"
          ? "draft"
          : "available",
    bookings: ridesByVehicle.get(String(vehicle._id)) ?? 0,
    dailyPrice: vehicle.dailyPrice ?? 0,
    weeklyPrice: vehicle.weeklyPrice ?? null,
    city: vehicle.city ?? null,
    pickupLocation: vehicle.pickupLocation ?? null,
    transmission: vehicle.transmission,
    fuelType: vehicle.fuelType,
    rating: {
      average: vehicle.ratingsAverage ?? null,
      count: vehicle.ratingsQuantity ?? 0,
    },
    gpsActive: Boolean(vehicle.location?.coordinates?.length === 2),
    photo: vehicle.photos?.[0] ?? null,
  });

  return {
    period: { from: null, to: null },
    company: company
      ? {
          id: String(company._id),
          name: company.name,
          city: company.city ?? null,
          code: company.slug ? `#${company.slug}` : null,
        }
      : null,
    summary: {
      total,
      available,
      rented,
      maintenance,
      draft,
    },
    list: rows.map(vehicleToRow),
    pagination: buildPaginationMeta({ page: currentPage, limit: pageSize, total: filteredTotal }),
  };
};