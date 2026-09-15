import multer from "multer";
import sharp from "sharp";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
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

  if (req.files.imageCover) {
    req.body.imageCover = `vehicle-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`public/vehicles/${req.body.imageCover}`);
  }

  if (req.files.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (file, i) => {
        const filename = `vehicle-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
        await sharp(file.buffer)
          .resize(2000, 1333)
          .toFormat("jpeg")
          .jpeg({ quality: 85 })
          .toFile(`public/vehicles/${filename}`);

        req.body.images.push(filename);
      })
    );
  }

  next();
});

export const getAllVehicles = catchAsync(async (req, res, next) => {
  const vehicles = await vehicleService.fetchAllVehicles(req.query);

  res.status(200).json({
    status: "success",
    results: vehicles.length,
    data: { vehicles },
  });
});

export const getVehicleById = catchAsync(async (req, res, next) => {
  const vehicle = await vehicleService.fetchVehicleById(req.params.id);

  res.status(200).json({
    status: "success",
    data: { vehicle },
  });
});

export const getCompanyVehicles = catchAsync(async (req, res, next) => {
  const companyId = req.tenantId || req.user.company;
  const vehicles = await vehicleService.fetchCompanyVehicles(companyId, req.query);

  res.status(200).json({
    status: "success",
    results: vehicles.length,
    data: { vehicles },
  });
});

export const createVehicle = catchAsync(async (req, res, next) => {
  const companyId = req.tenantId || req.user?.company;
  const vehicle = await vehicleService.createVehicleListing(
    req.body,
    req.files,
    companyId
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