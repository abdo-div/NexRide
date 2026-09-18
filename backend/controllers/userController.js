import multer from "multer";
import sharp from "sharp";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import * as userService from "../services/userService.js";

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

export const uploadUserPhoto = upload.single("photo");

export const resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/users/${req.file.filename}`);

  next();
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

export const deleteMe = catchAsync(async (req, res, next) => {
  await userService.softDeleteCurrentUser(req.user.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await userService.fetchAllUsers(req.query);

  res.status(200).json({
    status: "success",
    results: users.length,
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