import express from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { safePagination } from "../middlewares/pagination.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  getAllCompanies,
  updateCompanyStatus,
} from "../controllers/companyController.js";
import { getAllVehicles } from "../controllers/vehicleController.js";
import { getAllBookings } from "../controllers/bookingController.js";
import { getAllPayments } from "../controllers/paymentController.js";
import { updateCompanyStatusSchema } from "../validations/company.validation.js";

const router = express.Router();

// Platform-administrator-only listing endpoints. safePagination caps the
// per-page limit (default 20, max 100) and normalizes req.query so the
// APIFeatures-driven list services can never be forced to scan unbounded rows.
router.use(protect, restrictTo("admin"));

router.get("/companies", safePagination(20, 100), getAllCompanies);
router.get("/vehicles", safePagination(20, 100), getAllVehicles);
router.get("/bookings", safePagination(20, 100), getAllBookings);
// Commission/payout ledger lives on the Payment collection
// (commissionRate, commissionAmount, companyShare, payoutStatus).
router.get("/commissions", safePagination(20, 100), getAllPayments);

// Company onboarding approval (PENDING -> APPROVED / SUSPENDED / REJECTED)
router.patch(
  "/companies/:id/status",
  validate(updateCompanyStatusSchema),
  updateCompanyStatus,
);

export default router;