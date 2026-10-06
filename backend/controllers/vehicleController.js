import multer from "multer";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Company from "../models/Company_model.js";
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
  const publicOnly = req.user?.role !== "admin";
  const { vehicles, pagination } = await vehicleService.fetchAllVehicles(
    req.query,
    req.tenantId,
    publicOnly,
  );

  res.status(200).json({
    status: "success",
    results: vehicles.length,
    pagination,
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
  const vehicle = await vehicleService.fetchVehicleById(
    req.params.id,
    req.tenantId,
    req.user?.role !== "admin",
  );

  res.status(200).json({
    status: "success",
    data: { vehicle },
  });
});

export const getCompanyVehicles = catchAsync(async (req, res, next) => {
  // Company sessions are rigidly bound to their own tenant: `req.tenantId` is
  // populated by protect() from req.user.company, and a missing link fails
  // closed instead of trusting a caller-supplied ?companyId=. Admins may scope
  // to any tenant via the query param (or see the whole fleet when omitted).
  const isAdmin = req.user?.role === "admin";
  let companyId = isAdmin ? req.query.companyId || null : req.tenantId || null;

  if (!companyId && !isAdmin && req.user?.id) {
    const ownedCompany = await Company.findOne({ ownerId: req.user.id });
    if (ownedCompany) companyId = ownedCompany._id;
  }

  if (!companyId) {
    return next(
      new AppError("No company tenant is linked to this user account.", 403),
    );
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
  // A company session is never allowed to choose its tenant from the payload:
  // ownership comes from req.tenantId (populated by protect() from
  // req.user.company) or the user's owned company. Only admins may assign a
  // listing to an arbitrary companyId through the body.
  const isAdmin = req.user?.role === "admin";
  let companyId = isAdmin ? req.body.companyId || null : req.tenantId || null;

  if (!companyId && req.user?.id) {
    const ownedCompany = await Company.findOne({ ownerId: req.user.id });
    if (ownedCompany) companyId = ownedCompany._id;
  }

  if (!companyId) {
    return next(
      new AppError(
        isAdmin
          ? "companyId is required when an admin creates a vehicle listing."
          : "No company tenant is linked to this user account.",
        400,
      ),
    );
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
  const vehicle = await vehicleService.updateVehicleRecord(
    req.params.id,
    req.body,
    req.tenantId,
  );

  res.status(200).json({
    status: "success",
    data: { vehicle },
  });
});

export const updateVehicleStatus = catchAsync(async (req, res, next) => {
  const vehicle = await vehicleService.updateVehicleStatusById(
    req.params.id,
    req.body.statusType, // "operational" or "listing"
    req.body.status,
    req.tenantId,
  );

  res.status(200).json({
    status: "success",
    data: { vehicle },
  });
});

export const deleteVehicle = catchAsync(async (req, res, next) => {
  await vehicleService.softDeleteVehicleById(req.params.id, req.tenantId);

  res.status(204).json({
    status: "success",
    data: null,
  });
});