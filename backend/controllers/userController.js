import multer from "multer";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import * as userService from "../services/userService.js";
import { saveUserPhoto } from "../utils/userImages.js";
import {
  getDriverVerification,
  resolveDriverDocumentFile,
  reviewDriverVerification,
  saveCustomerDriverDocuments,
} from "../services/driverDocumentService.js";

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
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 20,
    parts: 21,
  },
});

export const uploadUserPhoto = upload.single("photo");

export const resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await saveUserPhoto(req.file.buffer, req.file.filename);

  next();
});

const driverDocumentUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (["application/pdf", "image/jpeg", "image/png"].includes(file.mimetype)) cb(null, true);
    else cb(new AppError("Documents must be PDF, JPG, or PNG files.", 400), false);
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 2, fields: 10, parts: 12 },
});

export const uploadDriverDocuments = driverDocumentUpload.fields([
  { name: "licence", maxCount: 1 },
  { name: "identity", maxCount: 1 },
]);

export const getMyDriverDocuments = catchAsync(async (req, res) => {
  const verification = await getDriverVerification(req.user.id, req.user);
  res.status(200).json({ status: "success", data: { verification } });
});

export const updateMyDriverDocuments = catchAsync(async (req, res) => {
  const verification = await saveCustomerDriverDocuments(req.user.id, req.files, req.body);
  res.status(200).json({ status: "success", data: { verification } });
});

export const getCustomerDriverDocuments = catchAsync(async (req, res) => {
  const verification = await getDriverVerification(req.params.id, req.user);
  res.status(200).json({ status: "success", data: { verification } });
});

export const reviewCustomerDriverDocuments = catchAsync(async (req, res) => {
  const verification = await reviewDriverVerification(req.params.id, req.user, req.body);
  res.status(200).json({ status: "success", data: { verification } });
});

export const downloadDriverDocument = catchAsync(async (req, res) => {
  const file = await resolveDriverDocumentFile(req.params.id, req.user, req.params.kind);
  res.type(file.mimeType);
  res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  res.sendFile(file.path);
});

/**
 * Injects logged-in user ID into params for getMe route
 */
export const getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

export const updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /update-my-password",
        400
      )
    );
  }

  const filteredBody = userService.filterAllowedFields(
    req.body,
    "name",
    "email",
    "phoneNumber"
  );

  if (req.file) filteredBody.photo = req.file.filename;

  const updatedUser = await userService.updateCurrentUserProfile(
    req.user.id,
    filteredBody
  );

  res.status(200).json({
    status: "success",
    data: { user: updatedUser },
  });
});

export const getMyPreferences = catchAsync(async (req, res) => {
  const user = await userService.fetchUserById(req.user.id);
  res.status(200).json({ status: "success", data: { preferences: user.preferences } });
});

export const updateMyPreferences = catchAsync(async (req, res) => {
  const user = await userService.updateCurrentUserProfile(req.user.id, {
    preferences: req.body,
  });
  res.status(200).json({ status: "success", data: { preferences: user.preferences } });
});

export const deleteMe = catchAsync(async (req, res, next) => {
  await userService.softDeleteCurrentUser(req.user.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const getAllUsers = catchAsync(async (req, res, next) => {
  const { users, pagination } = await userService.fetchAllUsers(req.query);

  res.status(200).json({
    status: "success",
    results: users.length,
    pagination,
    data: { users },
  });
});

export const getUserById = catchAsync(async (req, res, next) => {
  const user = await userService.fetchUserById(req.params.id);

  res.status(200).json({
    status: "success",
    data: { user },
  });
});

export const updateUser = catchAsync(async (req, res, next) => {
  const user = await userService.updateUserByAdmin(req.params.id, req.body);

  res.status(200).json({
    status: "success",
    data: { user },
  });
});

export const updateUserStatus = catchAsync(async (req, res, next) => {
  const user = await userService.updateUserAccountStatus(
    req.params.id,
    req.body.status
  );

  res.status(200).json({
    status: "success",
    data: { user },
  });
});

export const deleteUser = catchAsync(async (req, res, next) => {
  await userService.deleteUserByAdmin(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const createUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not defined! Please use /signup instead.",
  });
};
