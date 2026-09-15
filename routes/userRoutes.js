import express from "express";
import {
  signup,
  login,
  logout,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  updatePassword,
  protect,
  restrictTo,
} from "../controllers/authController.js";
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
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);

router.get("/verify-email/:token", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.patch("/reset-password/:token", resetPassword);

// -----------------------------------------------------------------------------
// PROTECTED USER SELF-SERVICE ROUTES (Authenticated Users)
// -----------------------------------------------------------------------------
router.use(protect);

router.patch("/update-my-password", updatePassword);
router.get("/me", getMe, getUserById);
router.patch("/update-me", uploadUserPhoto, resizeUserPhoto, updateMe);
router.delete("/delete-me", deleteMe);

// -----------------------------------------------------------------------------
// PLATFORM ADMIN & GOVERNANCE ROUTES (Super-Admin Portal)
// -----------------------------------------------------------------------------
router.use(restrictTo("admin"));

router
  .route("/")
  .get(getAllUsers)
  .post(signup);

router.patch("/:id/status", updateUserStatus);

router
  .route("/:id")
  .get(getUserById)
  .patch(updateUser)
  .delete(deleteUser);

export default router;