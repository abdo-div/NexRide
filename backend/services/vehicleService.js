import Vehicle from "../models/vehicle_model.js";
import Booking from "../models/booking_model.js";
import AppError from "../utils/appError.js";
import APIFeatures from "../utils/APIFeatures.js";

// A booking blocks a vehicle while it is paid or active on the customer's side.
// PENDING_PAYMENT and EXPIRED reservations are excluded: they have no locked dates.
const BOOKED_STATUSES = ["PAID", "CONFIRMED", "ACTIVE"];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Fetch all vehicles matching search/filter/pagination criteria
 * Automatically enforces tenant isolation when req.tenantId is provided
 */
export const fetchAllVehicles = async (queryParams, tenantId = null) => {
  // Inject tenant filter if request originates from a company subdomain
  const filter = tenantId ? { companyId: tenantId } : {};

  const features = new APIFeatures(Vehicle.find(filter), queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // The public fleet listing must expose the owning company so the client can
  // show a real operator name, logo and accreditation instead of a bare id.
  const vehicles = await features.query.populate(
    "companyId",
    "name logo city status",
  );
  return vehicles;
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
  const filter = {
    listingStatus: "PUBLISHED",
    operationalStatus: "AVAILABLE",
  };
  if (tenantId) filter.companyId = tenantId;

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
export const fetchVehicleById = async (vehicleId, tenantId = null) => {
  const filter = { _id: vehicleId };

  // Guard against accessing another company's vehicle directly by ID via URL
  if (tenantId) {
    filter.companyId = tenantId;
  }

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
  if (lng && lat) {
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
    const sharp = (await import("sharp")).default;
    const photoFilenames = [];

    if (files.imageCover) {
      const filename = `vehicle-${newVehicle._id}-${Date.now()}-cover.jpeg`;
      await sharp(files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`public/vehicles/${filename}`);
      photoFilenames.push(filename);
    }

    if (files.images) {
      const gallery = await Promise.all(
        files.images.map(async (file, i) => {
          const filename = `vehicle-${newVehicle._id}-${Date.now()}-${i + 1}.jpeg`;
          await sharp(file.buffer)
            .resize(2000, 1333)
            .toFormat("jpeg")
            .jpeg({ quality: 85 })
            .toFile(`public/vehicles/${filename}`);
          return filename;
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
 */
export const updateVehicleRecord = async (vehicleId, updateData) => {
  const vehicle = await Vehicle.findByIdAndUpdate(vehicleId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!vehicle) {
    throw new AppError("No vehicle found with that ID", 404);
  }

  return vehicle;
};

/**
 * Update vehicle operational or listing status
 */
export const updateVehicleStatusById = async (vehicleId, statusType, status) => {
  const operationalStatuses = ["AVAILABLE", "MAINTENANCE", "UNAVAILABLE"];
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

  const vehicle = await Vehicle.findByIdAndUpdate(vehicleId, updateField, {
    new: true,
    runValidators: true,
  });

  if (!vehicle) {
    throw new AppError("No vehicle found with that ID", 404);
  }

  return vehicle;
};

/**
 * Soft delete vehicle listing to maintain booking record history
 */
export const softDeleteVehicleById = async (vehicleId) => {
  const vehicle = await Vehicle.findByIdAndUpdate(
    vehicleId,
    { deletedAt: new Date() },
    { new: true }
  );

  if (!vehicle) {
    throw new AppError("No vehicle found with that ID", 404);
  }

  return null;
};