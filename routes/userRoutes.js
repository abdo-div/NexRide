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
  updateUserStatus,
  deleteUser,
  uploadUserPhoto,
  resizeUserPhoto,
} from "../controllers/userController.js";

const router = express.Router();

// -----------------------------------------------------------------------------
// PUBLIC AUTHENTICATION & ACCOUNT RECOVERY ROUTES
// -----------------------------------------------------------------------------

// Account creation & session authentication
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);

// Account verification & password recovery lifecycle
router.get("/verify-email/:token", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.patch("/reset-password/:token", resetPassword);

// -----------------------------------------------------------------------------
// PROTECTED USER SELF-SERVICE ROUTES (Authenticated Users)
// -----------------------------------------------------------------------------

// Global Authentication Guard: All routes defined below require a valid JWT access token
router.use(protect);

// Password modification for active authenticated sessions
router.patch("/update-my-password", updatePassword);

// Current user profile management
router.get("/me", getMe, getUserById);

// Profile updates (avatar upload, personal details, contact preferences)
router.patch("/update-me", uploadUserPhoto, resizeUserPhoto, updateMe);

// Account self-deactivation (Soft-delete: sets active state to false without destroying historical transaction records)
router.delete("/delete-me", deleteMe);

// -----------------------------------------------------------------------------
// PLATFORM ADMIN & GOVERNANCE ROUTES (Super-Admin Portal)
// -----------------------------------------------------------------------------

// Restrict all administrative identity management routes to system admins
router.use(restrictTo("admin"));

// User lifecycle management endpoints
router
  .route("/")
  .get(getAllUsers) // Supports query filtering by role (customer, company, admin) and account status
  .post(signup); // Admin provisioned account creation

// Granular account status toggle (SUSPENDED, ACTIVE, BAN)
router.patch("/:id/status", updateUserStatus);

// Direct account lookup and administrative mutations
router.route("/:id").get(getUserById).patch(updateUser).delete(deleteUser); // Hard-delete or permanent administrative purge

export default router;
