import express from "express";

import * as bookingController from "./../controllers/bookingController.js";
import * as authController from "./../controllers/authController.js";

const router = express.Router();

// All booking routes require authentication
router.use(authController.protect);

// ── USER ROUTES (any authenticated user) ────────────────────────────────────

// GET  /api/v1/bookings/my-bookings   → list logged-in user's bookings
router.get("/my-bookings", bookingController.getMyBookings);

// POST /api/v1/bookings/book          → create a booking (user auto-attached from JWT)
router.post("/book", bookingController.createMyBooking);

// GET  /api/v1/bookings/checkout-session/:carId  → get Stripe checkout session
router.get("/checkout-session/:carId", bookingController.getCheckoutSession);

// ── ADMIN ONLY ROUTES ────────────────────────────────────────────────────────
router.use(authController.restrictTo("admin"));

router
  .route("/")
  .get(bookingController.getAllBookings)   // GET  /api/v1/bookings
  .post(bookingController.createBooking); // POST /api/v1/bookings  (admin: supply user id manually)

router
  .route("/:id")
  .get(bookingController.getBooking)        // GET    /api/v1/bookings/:id
  .patch(bookingController.updateBooking)   // PATCH  /api/v1/bookings/:id
  .delete(bookingController.deleteBooking); // DELETE /api/v1/bookings/:id

export default router;
