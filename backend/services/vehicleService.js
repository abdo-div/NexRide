import Vehicle from "../models/vehicle_model.js";
import Booking from "../models/booking_model.js";
import Company from "../models/Company_model.js";
import AppError from "../utils/appError.js";
import APIFeatures from "../utils/APIFeatures.js";
import { runPaginatedQuery } from "../utils/paginatedQuery.js";
import { saveVehicleImage } from "../utils/vehicleImages.js";
import { DATE_BLOCKING_BOOKING_STATUSES } from "../utils/bookingStatus.js";

// A booking blocks a vehicle for its dates once the reservation exists. A
// PENDING_PAYMENT booking is written before the customer reaches the payment
// gateway, so it holds the dates too; `services/bookingExpiry.service.js`
// releases abandoned ones by flipping them to EXPIRED. COMPLETED rentals are
// in the past and never block future dates.
const BOOKED_STATUSES = DATE_BLOCKING_BOOKING_STATUSES;
const PUBLIC_FILTER_FIELDS = new Set([
  "type",
  "make",
  "model",
  "year",
  "city",
  "dailyPrice",
  "seats",
  "doors",
  "transmission",
  "fuelType",
  "pickupLocation",
]);
const PUBLIC_QUERY_CONTROLS = new Set([
  "page",
  "sort",
  "limit",
  "fields",
  "search",
]);

// Free-text search surfaces for the fleet listings. The admin registry exposes
// the wider set (owner name included via the populated company) while the public
// catalogue is limited to the customer-facing descriptive fields.
const VEHICLE_SEARCH_FIELDS = [
  "make",
  "model",
  "year",
  "type",
  "city",
  "pickupLocation",
  "operationalStatus",
  "listingStatus",
];
const PUBLIC_SEARCH_FIELDS = VEHICLE_SEARCH_FIELDS;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getApprovedCompanyIds = async () =>
  Company.find({ status: "APPROVED", deletedAt: null }).distinct("_id");

export const buildPublicVehicleFilter = (approvedCompanyIds, tenantId = null) => {
  const filter = {
    listingStatus: "PUBLISHED",
    operationalStatus: "AVAILABLE",
    deletedAt: null,
    companyId: { $in: approvedCompanyIds },
  };

  if (tenantId) filter.$and = [{ companyId: tenantId }];
  return filter;
};

export const sanitizePublicVehicleQuery = (queryParams = {}) =>
  Object.fromEntries(
    Object.entries(queryParams).filter(
      ([key]) =>
        PUBLIC_FILTER_FIELDS.has(key) || PUBLIC_QUERY_CONTROLS.has(key),
    ),
  );

export const getPublicVehicleFilter = async (vehicleId = null, tenantId = null) => {
  const filter = buildPublicVehicleFilter(
    await getApprovedCompanyIds(),
    tenantId,
  );
  if (vehicleId) filter._id = vehicleId;
  return filter;
};

/**
 * Fetch all vehicles matching search/filter/pagination criteria
 * Automatically enforces tenant isolation when req.tenantId is provided
 *
 * Returns the requested page together with pagination metadata. The count is
 * derived from the identical filter, so `pagination.total` matches the rows the
 * caller would reach by paging through the registry.
 */
export const fetchAllVehicles = async (
  queryParams,
  tenantId = null,
  publicOnly = false,
) => {
  // Inject tenant filter if request originates from a company subdomain
  const filter = publicOnly
    ? buildPublicVehicleFilter(await getApprovedCompanyIds(), tenantId)
    : tenantId
      ? { companyId: tenantId }
      : {};
  const effectiveQuery = publicOnly
    ? sanitizePublicVehicleQuery(queryParams)
    : queryParams;

  // The public fleet listing must expose the owning company so the client can
  // show a real operator name, logo and accreditation instead of a bare id.
  const { docs, pagination } = await runPaginatedQuery(
    Vehicle,
    filter,
    effectiveQuery,
    {
      searchFields: publicOnly ? PUBLIC_SEARCH_FIELDS : VEHICLE_SEARCH_FIELDS,
      populate: {
        path: "companyId",
        select: "name logo city status",
      },
    },
  );

  return { vehicles: docs, pagination };
};

/**
 * Public customer search for bookable vehicles.
 *
 * Combines the customer-facing filters (location, vehicle type, price) with
 * real availability: when `startDate`/`endDate` are supplied, every vehicle
 * that overlaps a PAID/CONFIRMED/ACTIVE booking in that range is excluded.
 * Availability is therefore computed server-side from the booking calendar,
 * never by the client.
 */
export const fetchAvailableVehicles = async (queryParams, tenantId = null) => {
  const filter = buildPublicVehicleFilter(
    await getApprovedCompanyIds(),
    tenantId,
  );

  // Location: case-insensitive match against the city or the pickup branch
  if (queryParams.location) {
    const regex = new RegExp(escapeRegExp(String(queryParams.location)), "i");
    filter.$or = [{ city: regex }, { pickupLocation: regex }];
  }

  // Vehicle type(s): comma-separated list of model enums
  if (queryParams.type) {
    const types = String(queryParams.type)
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
    if (types.length > 0) filter.type = { $in: types };
  }

  // Daily-rate bounds
  const minPrice = Number(queryParams.minPrice);
  if (queryParams.minPrice !== undefined && !Number.isNaN(minPrice)) {
    filter.dailyPrice = { ...(filter.dailyPrice || {}), $gte: minPrice };
  }
  const maxPrice = Number(queryParams.maxPrice);
  if (queryParams.maxPrice !== undefined && !Number.isNaN(maxPrice)) {
    filter.dailyPrice = { ...(filter.dailyPrice || {}), $lte: maxPrice };
  }

  // Availability: exclude vehicles that fall inside any active booking window
  if (queryParams.startDate && queryParams.endDate) {
    const start = new Date(queryParams.startDate);
    const end = new Date(queryParams.endDate);
    if (
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      start < end
    ) {
      const overlappingVehicleIds = await Booking.find({
        bookingStatus: { $in: BOOKED_STATUSES },
        startDate: { $lt: end },
        endDate: { $gt: start },
      }).distinct("vehicleId");

      // $nin with an empty list matches every vehicle, so a fully-free range
      // never wipes out the results.
      filter._id = { $nin: overlappingVehicleIds };
    }
  }

  const features = new APIFeatures(Vehicle.find(filter), queryParams)
    .sort()
    .limitFields()
    .paginate();

  const vehicles = await features.query.populate(
    "companyId",
    "name logo city status",
  );
  return vehicles;
};

/**
 * Fetch single vehicle by ID and populate user reviews
 */
export const fetchVehicleById = async (
  vehicleId,
  tenantId = null,
  publicOnly = true,
) => {
  const filter = publicOnly
    ? await getPublicVehicleFilter(vehicleId, tenantId)
    : { _id: vehicleId, ...(tenantId ? { companyId: tenantId } : {}) };

  const vehicle = await Vehicle.findOne(filter)
    .populate("companyId", "name logo city status")
    .populate({
      path: "reviews",
      select: "review rating customerId createdAt",
    });

  if (!vehicle) {
    throw new AppError("No vehicle found with that ID for this company.", 404);
  }

  return vehicle;
};

/**
 * Fetch fleet vehicles scoped strictly to a company tenant
 */
export const fetchCompanyVehicles = async (companyId, queryParams) => {
  const filter = companyId ? { companyId } : {};
  const features = new APIFeatures(Vehicle.find(filter), queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  return await features.query;
};

/**
 * Create a new vehicle listing
 */
export const createVehicleListing = async (bodyData, files, tenantCompanyId) => {
  const { lng, lat, ...vehicleData } = bodyData;

  // Build GeoJSON Point if coordinates are supplied
  if (lng !== undefined && lat !== undefined && lng !== "" && lat !== "") {
    vehicleData.location = {
      type: "Point",
      coordinates: [Number(lng), Number(lat)],
    };
  }

  // Attach owner company tenant ID
  if (tenantCompanyId) {
    vehicleData.companyId = tenantCompanyId;
  }

  const newVehicle = await Vehicle.create(vehicleData);

  // File processing via sharp (if photos are uploaded)
  if (files && (files.imageCover || files.images)) {
    const photoFilenames = [];

    if (files.imageCover) {
      const filename = `vehicle-${newVehicle._id}-${Date.now()}-cover.jpeg`;
      await saveVehicleImage(files.imageCover[0].buffer, filename, 90);
      photoFilenames.push(filename);
    }

    if (files.images) {
      const gallery = await Promise.all(
        files.images.map(async (file, i) => {
          const filename = `vehicle-${newVehicle._id}-${Date.now()}-${i + 1}.jpeg`;
          return saveVehicleImage(file.buffer, filename);
        })
      );
      photoFilenames.push(...gallery);
    }

    if (photoFilenames.length > 0) {
      newVehicle.photos = photoFilenames;
      await newVehicle.save({ validateBeforeSave: false });
    }
  }

  return newVehicle;
};

/**
 * Update vehicle record
 *
 * Tenant ownership is immutable, so any `companyId` in the payload is discarded
 * regardless of what validation allowed through. The zod schema already omits
 * the field, but the service is also reachable from other callers and from
 * seeded data, so the guarantee is enforced here too. Passing the field must
 * never be able to move a vehicle between tenants.
 *
 * When a company session supplies `tenantId`, the write filter carries
 * `companyId`, so a non-admin caller can never patch another tenant's vehicle
 * even if the route gate is bypassed. Admins pass no tenantId and stay
 * unscoped, which preserves the cross-tenant platform view.
 */
export const updateVehicleRecord = async (vehicleId, updateData, tenantId = null) => {
  const { companyId: _ignoredCompanyId, lng, lat, ...safeUpdateData } = updateData ?? {};
  if (lng !== undefined || lat !== undefined) {
    const current = await Vehicle.findOne({ _id: vehicleId, ...(tenantId ? { companyId: tenantId } : {}) });
    const longitude = lng === undefined ? current?.location?.coordinates?.[0] : Number(lng);
    const latitude = lat === undefined ? current?.location?.coordinates?.[1] : Number(lat);
    if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
      safeUpdateData.location = { type: "Point", coordinates: [longitude, latitude] };
    }
  }

  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: vehicleId, ...(tenantId ? { companyId: tenantId } : {}) },
    safeUpdateData,
    { new: true, runValidators: true },
  );

  if (!vehicle) {
    throw new AppError("No vehicle found with that ID", 404);
  }

  return vehicle;
};

/**
 * Update vehicle operational or listing status
 *
 * Scoped to the caller's tenant when `tenantId` is supplied so a company user
 * can never flip another tenant's vehicle state.
 */
export const updateVehicleStatusById = async (
  vehicleId,
  statusType,
  status,
  tenantId = null,
) => {
  const operationalStatuses = ["AVAILABLE", "MAINTENANCE", "SUSPENDED"];
  const listingStatuses = ["DRAFT", "PUBLISHED", "SUSPENDED"];

  const upperStatus = status ? status.toUpperCase() : "";

  let updateField = {};
  if (operationalStatuses.includes(upperStatus)) {
    updateField = { operationalStatus: upperStatus };
  } else if (listingStatuses.includes(upperStatus)) {
    updateField = { listingStatus: upperStatus };
  } else {
    throw new AppError(
      `Invalid vehicle status. Operational: ${operationalStatuses.join(", ")}. Listing: ${listingStatuses.join(", ")}`,
      400,
    );
  }

  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: vehicleId, ...(tenantId ? { companyId: tenantId } : {}) },
    updateField,
    { new: true, runValidators: true },
  );

  if (!vehicle) {
    throw new AppError("No vehicle found with that ID", 404);
  }

  return vehicle;
};

/**
 * Soft delete vehicle listing to maintain booking record history
 *
 * Scoped to the caller's tenant when `tenantId` is supplied so a company user
 * can never remove another tenant's unit.
 */
export const softDeleteVehicleById = async (vehicleId, tenantId = null) => {
  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: vehicleId, ...(tenantId ? { companyId: tenantId } : {}) },
    { deletedAt: new Date() },
    { new: true },
  );

  if (!vehicle) {
    throw new AppError("No vehicle found with that ID", 404);
  }

  return null;
};
