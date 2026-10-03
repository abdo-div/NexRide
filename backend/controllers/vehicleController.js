import multer from "multer";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { saveVehicleImage } from "../utils/vehicleImages.js";
import * as vehicleService from "../services/vehicleService.js";

// Multer Storage Configuration
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

export const uploadVehicleImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 3 },
]);

export const resizeVehicleImages = catchAsync(async (req, res, next) => {
  if (!req.files) return next();

  const photos = [];

  if (req.files.imageCover) {
    const filename = `vehicle-${req.params.id}-${Date.now()}-cover.jpeg`;
    photos.push(
      await saveVehicleImage(req.files.imageCover[0].buffer, filename, 90),
    );
  }

  if (req.files.images) {
    photos.push(
      ...(await Promise.all(
        req.files.images.map(async (file, i) => {
          const filename = `vehicle-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
          return saveVehicleImage(file.buffer, filename);
        }),
      )),
    );
  }

  if (photos.length > 0) req.body.photos = photos;
  next();
});

export const getAllVehicles = catchAsync(async (req, res, next) => {
  // Pass req.tenantId so subdomains filter automatically (returns all if req.tenantId is null)
  const vehicles = await vehicleService.fetchAllVehicles(req.query, req.tenantId);

  res.status(200).json({
    status: "success",
    results: vehicles.length,
    data: { vehicles },
  });
});

export const searchVehicles = catchAsync(async (req, res, next) => {
  // Public search combining customer filters with booking-calendar availability.
  const vehicles = await vehicleService.fetchAvailableVehicles(
    req.query,
    req.tenantId,
  );

  res.status(200).json({
    status: "success",
    results: vehicles.length,
    data: { vehicles },
  });
});

export const getVehicleById = catchAsync(async (req, res, next) => {
  // Pass req.tenantId to prevent accessing vehicles across tenant subdomains
  const vehicle = await vehicleService.fetchVehicleById(req.params.id, req.tenantId);

  res.status(200).json({
    status: "success",
    data: { vehicle },
  });
});

export const getCompanyVehicles = catchAsync(async (req, res, next) => {
  let companyId = req.tenantId || req.user.company;
  if (!companyId && req.user?.id) {
    const mongoose = (await import("mongoose")).default;
    const ownedCompany = await mongoose
      .model("Company")
      .findOne({ ownerId: req.user.id });
    if (ownedCompany) companyId = ownedCompany._id;
  }
  if (!companyId && req.query.companyId) {
    companyId = req.query.companyId;
  }

  const vehicles = await vehicleService.fetchCompanyVehicles(
    companyId,
    req.query,
  );

  res.status(200).json({
    status: "success",
    results: vehicles.length,
    data: { vehicles },
  });
});

export const createVehicle = catchAsync(async (req, res, next) => {
  let companyId = req.tenantId || req.user?.company;
  if (!companyId && req.body.companyId) {
    companyId = req.body.companyId;
  }
  if (!companyId && req.user?.id) {
    const mongoose = (await import("mongoose")).default;
    const ownedCompany = await mongoose
      .model("Company")
      .findOne({ ownerId: req.user.id });
    if (ownedCompany) companyId = ownedCompany._id;
  }

  const vehicle = await vehicleService.createVehicleListing(
    req.body,
    req.files,
    companyId,
  );

  res.status(201).json({
    status: "success",
    data: { vehicle },
  });
});

export const updateVehicle = catchAsync(async (req, res, next) => {
  const vehicle = await vehicleService.updateVehicleRecord(req.params.id, req.body);

  res.status(200).json({
    status: "success",
    data: { vehicle },
  });
});

export const updateVehicleStatus = catchAsync(async (req, res, next) => {
  const vehicle = await vehicleService.updateVehicleStatusById(
    req.params.id,
    req.body.statusType, // "operational" or "listing"
    req.body.status
  );

  res.status(200).json({
    status: "success",
    data: { vehicle },
  });
});

export const deleteVehicle = catchAsync(async (req, res, next) => {
  await vehicleService.softDeleteVehicleById(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});