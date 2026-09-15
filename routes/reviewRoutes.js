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

const router = express.Router({ mergeParams: true });

// -----------------------------------------------------------------------------
// PUBLIC READING ROUTES
// -----------------------------------------------------------------------------
router.get("/", getAllReviews);
router.get("/:id", getReviewById);

// -----------------------------------------------------------------------------
// PROTECTED CUSTOMER & TENANT ROUTES
// -----------------------------------------------------------------------------
router.use(protect);

router.post(
  "/",
  restrictTo("customer"),
  setVehicleAndCustomerIds,
  verifyCompletedBooking,
  createReview
);

router.patch("/:id", restrictTo("customer"), updateReview);
router.delete("/:id", restrictTo("customer", "admin"), deleteReview);

// -----------------------------------------------------------------------------
// TENANT FLEET MANAGEMENT ROUTES
// -----------------------------------------------------------------------------
router.get(
  "/tenant/fleet-reviews",
  restrictTo("company", "admin"),
  getCompanyReviews
);

router.post("/:id/reply", restrictTo("company"), addCompanyResponse);

export default router;