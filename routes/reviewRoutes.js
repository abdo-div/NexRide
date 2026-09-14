import express from "express";
import {
  getAllReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  setVehicleAndCustomerIds,
  verifyCompletedBooking,
  addCompanyResponse,
  getCompanyReviews,
} from "../controllers/reviewController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

// mergeParams: true allows access to parent parameters (e.g., :vehicleId from vehicle_routes.js)
const router = express.Router({ mergeParams: true });

// -----------------------------------------------------------------------------
// PUBLIC READING ROUTES (Marketplace & Storefront Views)
// -----------------------------------------------------------------------------

// Fetch all reviews (Supports querying globally or nested under a specific vehicle: /api/v1/vehicles/:vehicleId/reviews)
router.get("/", getAllReviews);

// Fetch a single review by ID
router.get("/:id", getReviewById);

// -----------------------------------------------------------------------------
// PROTECTED CUSTOMER & TENANT ROUTES
// -----------------------------------------------------------------------------
// Enforce JWT authentication for writing, editing, or deleting reviews
router.use(protect);

// Post a new review
router.post(
  "/",
  restrictTo("customer"),
  setVehicleAndCustomerIds, // Middleware: auto-populates req.body.vehicleId from params & req.body.customer from req.user
  verifyCompletedBooking, // Enterprise Guard: verifies customer actually completed a rental for this vehicle
  createReview,
);

// Edit or delete customer's own review
router.patch("/:id", restrictTo("customer"), updateReview);
router.delete("/:id", restrictTo("customer", "admin"), deleteReview);

// -----------------------------------------------------------------------------
// TENANT FLEET MANAGEMENT ROUTES (Rental Company Portal)
// -----------------------------------------------------------------------------

// Fetch all reviews for the logged-in company's fleet
router.get(
  "/tenant/fleet-reviews",
  restrictTo("company", "admin"),
  getCompanyReviews,
);

// Company Management: Reply to a customer review on their vehicle
router.post("/:id/reply", restrictTo("company"), addCompanyResponse);

export default router;
