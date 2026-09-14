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
} from "../middleware/authMiddleware.js";

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
router.get("/check-availability", checkVehicleAvailability);

// Customer self-service: Fetch bookings made by the logged-in customer
router.get("/my-bookings", restrictTo("customer"), getMyBookings);

// Create new reservation (executes atomic overlap check & server-side price calculation)
router.post("/book", restrictTo("customer"), createBooking);

// Initialize online payment checkout session (Stripe / Local Payment Gateways)
router.get(
  "/checkout-session/:vehicleId",
  restrictTo("customer"),
  getCheckoutSession,
);

// Customer or Admin cancellation route (applies cancellation business rules & refund windows)
router.patch("/:id/cancel", verifyTenantAccess("Booking"), cancelBooking);

// -----------------------------------------------------------------------------
// TENANT FLEET MANAGEMENT ROUTES (Rental Company Dashboard)
// -----------------------------------------------------------------------------

// Fetch bookings belonging strictly to the logged-in company's fleet
router.get(
  "/tenant/fleet-bookings",
  restrictTo("company", "admin"),
  getCompanyBookings,
);

// Update booking lifecycle state (CONFIRMED -> ACTIVE -> COMPLETED)
router.patch(
  "/:id/status",
  restrictTo("company", "admin"),
  verifyTenantAccess("Booking"),
  updateBookingStatus,
);

// -----------------------------------------------------------------------------
// ADMINISTRATIVE & GENERAL LOOKUP ROUTES
// -----------------------------------------------------------------------------

// Fetch single booking details (guarded by tenant access verification)
router.get("/:id", verifyTenantAccess("Booking"), getBookingById);

// Platform Super-Admin: Query all bookings across all marketplace companies
router.get("/", restrictTo("admin"), getAllBookings);

export default router;
