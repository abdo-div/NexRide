import express from "express";
import {
  createBooking,
  getAllBookings,
  getBookingById,
  getMyBookings,
  getCompanyBookings,
  cancelBooking,
  updateBookingStatus,
  checkVehicleAvailability,
  downloadBookingInvoice,
} from "../controllers/bookingController.js";
import {
  protect,
  restrictTo,
  verifyTenantAccess,
} from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParamSchema } from "../validations/common.validation.js";
import {
  createBookingSchema,
  checkAvailabilitySchema,
} from "../validations/booking.validation.js";

const router = express.Router();

// -----------------------------------------------------------------------------
// PUBLIC ROUTES
// -----------------------------------------------------------------------------

// Pre-booking concurrency check — intentionally BEFORE the auth guard so the
// customer can verify availability from the vehicle detail page before login.
// Exposes only "is available?" (the same data the public /vehicles/search
// endpoint already derives from, never booking content itself).
/**
 * @openapi
 * /bookings/check-availability:
 *   get:
 *     tags: [Bookings]
 *     summary: Pre-booking overlap check
 *     description: >-
 *       Public by design so a customer can confirm availability from the
 *       vehicle detail page before signing in. Returns only is-available
 *       information, never booking content.
 *     parameters:
 *       - in: query
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Availability verdict
 *       400:
 *         description: Validation error
 */
router.get(
  ["/check-availability", "/checkAvailability"],
  validate(checkAvailabilitySchema),
  checkVehicleAvailability,
);

// -----------------------------------------------------------------------------
// GLOBAL AUTH GUARD
// -----------------------------------------------------------------------------
// All other booking interactions require valid JWT authentication
router.use(protect);

// -----------------------------------------------------------------------------
// CUSTOMER & SEARCH ROUTES
// -----------------------------------------------------------------------------

// Customer self-service: Fetch bookings made by the logged-in customer
/**
 * @openapi
 * /bookings/my-bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: Bookings made by the authenticated customer
 *     responses:
 *       200:
 *         description: Customer booking list
 *       403:
 *         description: Customer role required
 */
router.get(
  ["/my-bookings", "/myBookings"],
  restrictTo("customer"),
  getMyBookings,
);

/**
 * @openapi
 * /bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Create a reservation
 *     description: >-
 *       Runs the atomic overlap check and computes the price server-side. The
 *       route is idempotency-key protected for 24 hours.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleId, startDate, endDate]
 *             properties:
 *               vehicleId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, moamalat]
 *     responses:
 *       201:
 *         description: Booking created
 *       409:
 *         description: Vehicle unavailable for the requested window
 *       403:
 *         description: Customer role required
 */
router.post(
  ["/", "/book"],
  restrictTo("customer"),
  validate(createBookingSchema),
  createBooking,
);

// -----------------------------------------------------------------------------
// TENANT FLEET MANAGEMENT ROUTES (Rental Company Dashboard)
// -----------------------------------------------------------------------------

// Fetch bookings belonging strictly to the logged-in company's fleet
/**
 * @openapi
 * /bookings/tenant/fleet-bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: Bookings for the authenticated company's fleet
 *     responses:
 *       200:
 *         description: Company booking list
 *       403:
 *         description: Company or admin role required
 */
router.get(
  ["/tenant/fleet-bookings", "/tenant/fleetBookings"],
  restrictTo("company", "admin"),
  getCompanyBookings,
);

// -----------------------------------------------------------------------------
// ADMINISTRATIVE & GENERAL LOOKUP ROUTES
// -----------------------------------------------------------------------------

// Platform Super-Admin: Query all bookings across all marketplace companies
// NOTE: This must come BEFORE /:id to avoid "all" being treated as an ID
/**
 * @openapi
 * /bookings:
 *   get:
 *     tags: [Admin]
 *     summary: List every booking on the platform
 *     responses:
 *       200:
 *         description: Paginated booking list
 *       403:
 *         description: Admin role required
 */
router.get("/", restrictTo("admin"), getAllBookings);

/**
 * @openapi
 * /bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Booking detail (tenant-scoped)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking document
 *       403:
 *         description: Tenant access denied
 *       404:
 *         description: Booking not found
 */
router.get(
  "/:id",
  validate(idParamSchema()),
  verifyTenantAccess("Booking"),
  getBookingById,
);

/**
 * @openapi
 * /bookings/{id}/invoice:
 *   get:
 *     tags: [Bookings]
 *     summary: Download the booking invoice PDF
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice PDF
 *       403:
 *         description: Tenant access denied
 */
router.get(
  "/:id/invoice",
  validate(idParamSchema()),
  verifyTenantAccess("Booking"),
  downloadBookingInvoice,
);

/**
 * @openapi
 * /bookings/{id}/cancel:
 *   patch:
 *     tags: [Bookings]
 *     summary: Cancel a booking
 *     description: Applies the cancellation window and refund rules.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       403:
 *         description: Tenant access denied
 */
router.patch(
  "/:id/cancel",
  validate(idParamSchema()),
  verifyTenantAccess("Booking"),
  cancelBooking,
);

/**
 * @openapi
 * /bookings/{id}/status:
 *   patch:
 *     tags: [Bookings]
 *     summary: Advance the booking lifecycle state
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingStatus]
 *             properties:
 *               bookingStatus:
 *                 type: string
 *                 enum: [CONFIRMED, ACTIVE, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status transition
 *       403:
 *         description: Tenant access denied
 */
router.patch(
  "/:id/status",
  restrictTo("company", "admin"),
  validate(idParamSchema()),
  verifyTenantAccess("Booking"),
  updateBookingStatus,
);

export default router;
