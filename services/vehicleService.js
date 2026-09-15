import sharp from "sharp";
import Vehicle from "../models/vehicle_model.js";
import AppError from "../utils/appError.js";
import APIFeatures from "../utils/APIFeatures.js";

/**
 * Fetch all vehicles matching search/filter/pagination criteria
 */
export const fetchAllVehicles = async (queryParams) => {
  const features = new APIFeatures(Vehicle.find(), queryParams)
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
export const fetchVehicleById = async (vehicleId) => {
  const vehicle = await Vehicle.findById(vehicleId).populate({
    path: "reviews",
    select: "review rating user -vehicle",
  });

  if (!vehicle) {
    throw new AppError("No vehicle found with that ID", 404);
  }

  return vehicle;
};

/**
 * Fetch fleet vehicles scoped strictly to a company tenant
 */
export const fetchCompanyVehicles = async (companyId, queryParams) => {
  const filter = companyId ? { company: companyId } : {};
  const features = new APIFeatures(Vehicle.find(filter), queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  return await features.query;
};

/**
 * Create a new vehicle listing with GeoJSON conversion and file processing
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

  // Attach owner company tenant ID if passed from auth session
  if (tenantCompanyId) {
    vehicleData.company = tenantCompanyId;
  }

  if (vehicleData.features && !Array.isArray(vehicleData.features)) {
    vehicleData.features = [vehicleData.features];
  }

  vehicleData.imageCover = vehicleData.imageCover || "temp-cover.jpeg";
  const newVehicle = await Vehicle.create(vehicleData);

  // File processing via sharp
  if (files && files.imageCover) {
    const filename = `vehicle-${newVehicle._id}-${Date.now()}-cover.jpeg`;
    await sharp(files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`public/vehicles/${filename}`);

    newVehicle.imageCover = filename;
  }

  if (files && files.images) {
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
    newVehicle.images = gallery;
  }

  if (files && (files.imageCover || files.images)) {
    await newVehicle.save({ validateBeforeSave: false });
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
 * Update vehicle operational/listing status
 */
export const updateVehicleStatusById = async (vehicleId, status) => {
  const allowedStatuses = ["AVAILABLE", "MAINTENANCE", "RENTED", "PUBLISHED", "UNPUBLISHED"];
  if (!status || !allowedStatuses.includes(status.toUpperCase())) {
    throw new AppError("Invalid vehicle status value provided", 400);
  }

  const vehicle = await Vehicle.findByIdAndUpdate(
    vehicleId,
    { status: status.toUpperCase() },
    { new: true, runValidators: true }
  );

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
    { active: false, isDeleted: true },
    { new: true }
  );

  if (!vehicle) {
    throw new AppError("No vehicle found with that ID", 404);
  }

  return null;
};