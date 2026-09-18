import Vehicle from "../models/vehicle_model.js";
import AppError from "../utils/appError.js";
import APIFeatures from "../utils/APIFeatures.js";

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

  const vehicles = await features.query;
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

  const vehicle = await Vehicle.findOne(filter).populate({
    path: "reviews",
    select: "review rating customerId",
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