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
/**
 * @openapi
 * /cars/{vehicleId}/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Public reviews for a vehicle
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review list
 */
router.get("/", getAllReviews);

// -----------------------------------------------------------------------------
// PROTECTED CUSTOMER & TENANT ROUTES
// -----------------------------------------------------------------------------
router.use(protect);

// IMPORTANT: Static routes must come BEFORE parameterized /:id routes
// Tenant fleet management route

/**
 * @openapi
 * /cars/{vehicleId}/reviews/tenant/fleet-reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Reviews across the authenticated company's fleet
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company review list
 *       403:
 *         description: Company or admin role required
 */
router.get(
  ["/tenant/fleet-reviews", "/tenant/fleetReviews"],
  restrictTo("company", "admin"),
  getCompanyReviews,
);

/**
 * @openapi
 * /cars/{vehicleId}/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Review a completed booking
 *     description: >-
 *       Only a customer with a completed booking for this vehicle may review;
 *       the vehicle and customer ids are derived from the route and session.
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating, comment]
 *             properties:
 *               rating:
 *                 type: integer
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review created
 *       403:
 *         description: No completed booking for this vehicle
 */
router.post(
  "/",
  restrictTo("customer"),
  validate(createReviewSchema),
  setVehicleAndCustomerIds,
  verifyCompletedBooking,
  createReview,
);

// Parameterized routes

/**
 * @openapi
 * /cars/{vehicleId}/reviews/{id}:
 *   get:
 *     tags: [Reviews]
 *     summary: Review detail
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review document
 *       404:
 *         description: Review not found
 *   patch:
 *     tags: [Reviews]
 *     summary: Update an owned review
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review updated
 *       403:
 *         description: Not the review owner
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete a review
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted
 */
router.get("/:id", getReviewById);
router.patch(
  "/:id",
  restrictTo("customer"),
  validate(updateReviewSchema),
  updateReview,
);
router.delete("/:id", restrictTo("customer", "admin"), deleteReview);

/**
 * @openapi
 * /cars/{vehicleId}/reviews/{id}/reply:
 *   post:
 *     tags: [Reviews]
 *     summary: Add a company reply to a review
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reply stored
 *       403:
 *         description: Company role required
 */
router.post(
  "/:id/reply",
  restrictTo("company"),
  validate(companyResponseSchema),
  addCompanyResponse,
);

export default router;
