import express from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { safePagination } from "../middlewares/pagination.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  getAllAdminCompanies,
  updateCompanyStatus,
} from "../controllers/companyController.js";
import { getAllVehicles } from "../controllers/vehicleController.js";
import { getAllBookings } from "../controllers/bookingController.js";
import { getAllPayments } from "../controllers/paymentController.js";
import {
  approvePayoutDispatch,
  generatePayoutBatch,
  getPayoutLedger,
  getPayoutSummary,
} from "../controllers/payoutController.js";
import {
  completeMaintenance,
  createMaintenance,
  getMaintenanceEvents,
  getMaintenanceSummary,
  releaseMaintenanceVehicle,
} from "../controllers/maintenanceController.js";
import { updateCompanyStatusSchema } from "../validations/company.validation.js";
import { getAnalyticsSummary } from "../controllers/analyticsController.js";
import {
  getPlatformSettings,
  updatePlatformSettingsEntry,
} from "../controllers/settingsController.js";

const router = express.Router();

// Platform-administrator-only listing endpoints. safePagination caps the
// per-page limit (default 20, max 100) and normalizes req.query so the
// APIFeatures-driven list services can never be forced to scan unbounded rows.
router.use(protect, restrictTo("admin"));

router.get("/companies", safePagination(20, 100), getAllAdminCompanies);
router.get("/vehicles", safePagination(20, 100), getAllVehicles);
router.get("/bookings", safePagination(20, 100), getAllBookings);
// Commission/payout ledger lives on the Payment collection
// (commissionRate, commissionAmount, companyShare, payoutStatus).
router.get("/commissions", safePagination(20, 100), getAllPayments);

// Aggregated settlement surface for Commissions & Payouts. Summary and ledger
// are computed live from the Payment ledger via aggregation pipelines; the
// batch actions transition payoutStatus through the dispatcher lifecycle.
router.get("/payouts/summary", getPayoutSummary);
router.get("/payouts/ledger", getPayoutLedger);
router.post("/payouts/dispatch", generatePayoutBatch);
router.post("/payouts/settle", approvePayoutDispatch);

// Fleet Maintenance & Quarantine: health summary, event ledger and the
// lifecycle actions. Events mirror the Vehicle operationalStatus transitions.
router.get("/maintenance/summary", getMaintenanceSummary);
router.get("/maintenance", safePagination(20, 100), getMaintenanceEvents);
router.post("/maintenance", createMaintenance);
router.patch("/maintenance/:id/complete", completeMaintenance);
router.post("/maintenance/:vehicleId/release", releaseMaintenanceVehicle);

// Reports & Analytics: live executive summary aggregated across the fleet,
// booking funnel, payment ledger and renter cohorts.
router.get("/reports/summary", getAnalyticsSummary);

// Platform Settings & Governance: persisted config registry with a live
// governance snapshot. PATCH accepts partial sections or { reset: true }.
router.get("/settings", getPlatformSettings);
router.patch("/settings", updatePlatformSettingsEntry);

// Company onboarding approval (PENDING -> APPROVED / SUSPENDED / REJECTED)
router.patch(
  "/companies/:id/status",
  validate(updateCompanyStatusSchema),
  updateCompanyStatus,
);

export default router;