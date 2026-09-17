import express from "express";
import {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
  updatePassword,
} from "../controllers/authController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
} from "../validations/auth.validation.js";
import {
  updateMeSchema,
  adminUpdateUserSchema,
  updateUserStatusSchema,
} from "../validations/user.validation.js";
import { idParamSchema } from "../validations/common.validation.js";
import {
  getMe,
  getUserById,
  getAllUsers,
  updateMe,
  deleteMe,
  updateUser,
  updateUserStatus,
  deleteUser,
  uploadUserPhoto,
  resizeUserPhoto,
} from "../controllers/userController.js";

const router = express.Router();

// -----------------------------------------------------------------------------
// PUBLIC AUTHENTICATION & ACCOUNT RECOVERY ROUTES
// -----------------------------------------------------------------------------
router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);

router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/forgotPassword", validate(forgotPasswordSchema), forgotPassword);
router.patch(
  "/reset-password/:token",
  validate(resetPasswordSchema),
  resetPassword,
);
router.patch(
  "/resetPassword/:token",
  validate(resetPasswordSchema),
  resetPassword,
);

// -----------------------------------------------------------------------------
// PROTECTED USER SELF-SERVICE ROUTES (Authenticated Users)
// -----------------------------------------------------------------------------
router.use(protect);

router.patch(
  "/update-my-password",
  validate(updatePasswordSchema),
  updatePassword,
);
router.patch(
  "/updateMyPassword",
  validate(updatePasswordSchema),
  updatePassword,
);
router.patch("/updatePassword", validate(updatePasswordSchema), updatePassword);
router.get("/me", getMe, getUserById);
router.patch(
  "/update-me",
  uploadUserPhoto,
  resizeUserPhoto,
  validate(updateMeSchema),
  updateMe,
);
router.patch(
  "/updateMe",
  uploadUserPhoto,
  resizeUserPhoto,
  validate(updateMeSchema),
  updateMe,
);
router.delete("/delete-me", deleteMe);
router.delete("/deleteMe", deleteMe);

// -----------------------------------------------------------------------------
// PLATFORM ADMIN & GOVERNANCE ROUTES (Super-Admin Portal)
// -----------------------------------------------------------------------------
router.use(restrictTo("admin"));

router.route("/").get(getAllUsers).post(validate(signupSchema), signup);

router.patch(
  "/:id/status",
  validate(updateUserStatusSchema),
  updateUserStatus,
);

router
  .route("/:id")
  .get(validate(idParamSchema()), getUserById)
  .patch(validate(adminUpdateUserSchema), updateUser)
  .delete(validate(idParamSchema()), deleteUser);

export default router;
