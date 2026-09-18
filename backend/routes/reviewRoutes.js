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
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createReviewSchema,
  updateReviewSchema,
  companyResponseSchema,
} from "../validations/review.validation.js";

const router = express.Router({ mergeParams: true });

// -----------------------------------------------------------------------------
// PUBLIC READING ROUTES
// -----------------------------------------------------------------------------
router.get("/", getAllReviews);

// -----------------------------------------------------------------------------
// PROTECTED CUSTOMER & TENANT ROUTES
// -----------------------------------------------------------------------------
router.use(protect);

// IMPORTANT: Static routes must come BEFORE parameterized /:id routes
// Tenant fleet management route
router.get(
  ["/tenant/fleet-reviews", "/tenant/fleetReviews"],
  restrictTo("company", "admin"),
  getCompanyReviews,
);

router.post(
  "/",
  restrictTo("customer"),
  validate(createReviewSchema),
  setVehicleAndCustomerIds,
  verifyCompletedBooking,
  createReview,
);

// Parameterized routes
router.get("/:id", getReviewById);
router.patch(
  "/:id",
  restrictTo("customer"),
  validate(updateReviewSchema),
  updateReview,
);
router.delete("/:id", restrictTo("customer", "admin"), deleteReview);
router.post(
  "/:id/reply",
  restrictTo("company"),
  validate(companyResponseSchema),
  addCompanyResponse,
);

export default router;
