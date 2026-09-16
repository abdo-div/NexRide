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

router.post("/forgot-password", forgotPassword);
router.post("/forgotPassword", forgotPassword);
router.patch("/reset-password/:token", resetPassword);
router.patch("/resetPassword/:token", resetPassword);

// -----------------------------------------------------------------------------
// PROTECTED USER SELF-SERVICE ROUTES (Authenticated Users)
// -----------------------------------------------------------------------------
router.use(protect);

router.patch("/update-my-password", updatePassword);
router.patch("/updateMyPassword", updatePassword);
router.patch("/updatePassword", updatePassword);
router.get("/me", getMe, getUserById);
router.patch("/update-me", uploadUserPhoto, resizeUserPhoto, updateMe);
router.patch("/updateMe", uploadUserPhoto, resizeUserPhoto, updateMe);
router.delete("/delete-me", deleteMe);
router.delete("/deleteMe", deleteMe);

// -----------------------------------------------------------------------------
// PLATFORM ADMIN & GOVERNANCE ROUTES (Super-Admin Portal)
// -----------------------------------------------------------------------------
router.use(restrictTo("admin"));

router.route("/").get(getAllUsers).post(signup);

router.patch("/:id/status", updateUserStatus);

router.route("/:id").get(getUserById).patch(updateUser).delete(deleteUser);

export default router;
