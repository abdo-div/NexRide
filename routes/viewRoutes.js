import express from "express";
import * as viewsController from "../controllers/viewController.js";
import * as authController from "../controllers/authController.js";
import * as bookingController from "../controllers/bookingController.js";

const router = express.Router();

// Parse custom query alerts if you have them implemented
router.use(viewsController.alerts);

// 🚗 Clean NexRide Views Map
router.get("/", authController.isLoggedIn, viewsController.getOverview); // Home page showing all cars
router.get(
  "/car/:id",
  authController.isLoggedIn,
  viewsController.getCarDetails,
); // Individual car details profile view
router.get("/login", authController.isLoggedIn, viewsController.getLoginForm); // Authentication login screen page
router.get("/forgot-password", authController.isLoggedIn, viewsController.getForgotPasswordForm); // Forgot password form page
router.get("/fleet", authController.isLoggedIn, viewsController.getFleetPage); // Fleet browsing page
router.get(
  "/admin/create-car-offer",
  authController.protect,
  authController.restrictTo("admin"),
  viewsController.getCreateCarOffer,
); // Create car offer page (admin only)

// 👤 Secure Protected User Profiles
router.get("/me", authController.protect, viewsController.getAccount); // Settings profile panel
router.get(
  "/my-rentals",
  authController.protect,
  bookingController.createBookingFromCheckout, // ← auto-create booking on Stripe redirect
  viewsController.getMyRentals,
); // Lists user's active/past vehicle reservations

// 🛠️ Profile Form Handler Submissions
router.post(
  "/submit-user-data",
  authController.protect,
  viewsController.updateUserData,
);

export default router;
