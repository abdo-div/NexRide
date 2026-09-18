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
  getCheckoutSession,
} from "../controllers/bookingController.js";
import {
  protect,
  restrictTo,
  verifyTenantAccess,
} from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createBookingSchema,
  checkAvailabilitySchema,
  checkoutSessionSchema,
} from "../validations/booking.validation.js";

const router = express.Router();

// -----------------------------------------------------------------------------
// GLOBAL AUTH GUARD
// -----------------------------------------------------------------------------
// All booking interactions require valid JWT authentication
router.use(protect);

// -----------------------------------------------------------------------------
// CUSTOMER & SEARCH ROUTES
// -----------------------------------------------------------------------------

// Pre-booking concurrency check (validates dates against existing reservations before checkout)
router.get(
  ["/check-availability", "/checkAvailability"],
  validate(checkAvailabilitySchema),
  checkVehicleAvailability,
);

// Customer self-service: Fetch bookings made by the logged-in customer
router.get(
  ["/my-bookings", "/myBookings"],
  restrictTo("customer"),
  getMyBookings,
);

// Create new reservation (executes atomic overlap check & server-side price calculation)
router.post(
  ["/", "/book"],
  restrictTo("customer"),
  validate(createBookingSchema),
  createBooking,
);

// Initialize online payment checkout session (Stripe / Local Payment Gateways)
router.get(
  "/checkout-session/:vehicleId",
  restrictTo("customer"),
  validate(checkoutSessionSchema),
  getCheckoutSession,
);

// -----------------------------------------------------------------------------
// TENANT FLEET MANAGEMENT ROUTES (Rental Company Dashboard)
// -----------------------------------------------------------------------------

// Fetch bookings belonging strictly to the logged-in company's fleet
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
router.get("/", restrictTo("admin"), getAllBookings);

// Fetch single booking details (guarded by tenant access verification)
router.get("/:id", verifyTenantAccess("Booking"), getBookingById);

// Customer or Admin cancellation route (applies cancellation business rules & refund windows)
router.patch("/:id/cancel", verifyTenantAccess("Booking"), cancelBooking);

// Update booking lifecycle state (CONFIRMED -> ACTIVE -> COMPLETED)
router.patch(
  "/:id/status",
  restrictTo("company", "admin"),
  verifyTenantAccess("Booking"),
  updateBookingStatus,
);

export default router;
