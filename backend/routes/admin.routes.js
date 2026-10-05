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

/**
 * @openapi
 * /admin/companies:
 *   get:
 *     tags: [Admin]
 *     summary: List companies for the admin portal
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated company list
 *       403:
 *         description: Admin role required
 */
router.get("/companies", safePagination(20, 100), getAllAdminCompanies);

/**
 * @openapi
 * /admin/vehicles:
 *   get:
 *     tags: [Admin]
 *     summary: List vehicles for the admin portal
 *     responses:
 *       200:
 *         description: Paginated vehicle list
 *       403:
 *         description: Admin role required
 */
router.get("/vehicles", safePagination(20, 100), getAllVehicles);

/**
 * @openapi
 * /admin/bookings:
 *   get:
 *     tags: [Admin]
 *     summary: List bookings for the admin portal
 *     responses:
 *       200:
 *         description: Paginated booking list
 *       403:
 *         description: Admin role required
 */
router.get("/bookings", safePagination(20, 100), getAllBookings);

// Commission/payout ledger lives on the Payment collection
// (commissionRate, commissionAmount, companyShare, payoutStatus).

/**
 * @openapi
 * /admin/commissions:
 *   get:
 *     tags: [Admin]
 *     summary: Commission ledger for the admin portal
 *     responses:
 *       200:
 *         description: Paginated commission list
 *       403:
 *         description: Admin role required
 */
router.get("/commissions", safePagination(20, 100), getAllPayments);

// Aggregated settlement surface for Commissions & Payouts. Summary and ledger
// are computed live from the Payment ledger via aggregation pipelines; the
// batch actions transition payoutStatus through the dispatcher lifecycle.

/**
 * @openapi
 * /admin/payouts/summary:
 *   get:
 *     tags: [Admin]
 *     summary: Platform-wide payout KPI summary
 *     responses:
 *       200:
 *         description: Aggregated payout summary
 *       403:
 *         description: Admin role required
 */
router.get("/payouts/summary", getPayoutSummary);

/**
 * @openapi
 * /admin/payouts/ledger:
 *   get:
 *     tags: [Admin]
 *     summary: One aggregated settlement run per fleet operator
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Settlement ledger
 *       403:
 *         description: Admin role required
 */
router.get("/payouts/ledger", getPayoutLedger);

/**
 * @openapi
 * /admin/payouts/dispatch:
 *   post:
 *     tags: [Admin]
 *     summary: Generate the LFB payout-run batch
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Batch generated
 *       403:
 *         description: Admin role required
 */
router.post("/payouts/dispatch", generatePayoutBatch);

/**
 * @openapi
 * /admin/payouts/settle:
 *   post:
 *     tags: [Admin]
 *     summary: Settle a fleet operator's payout queue
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payout queue settled
 *       403:
 *         description: Admin role required
 */
router.post("/payouts/settle", approvePayoutDispatch);

// Fleet Maintenance & Quarantine: health summary, event ledger and the
// lifecycle actions. Events mirror the Vehicle operationalStatus transitions.

/**
 * @openapi
 * /admin/maintenance/summary:
 *   get:
 *     tags: [Admin]
 *     summary: Fleet health overview
 *     responses:
 *       200:
 *         description: Maintenance KPI summary
 *       403:
 *         description: Admin role required
 */
router.get("/maintenance/summary", getMaintenanceSummary);

/**
 * @openapi
 * /admin/maintenance:
 *   get:
 *     tags: [Admin]
 *     summary: Maintenance event ledger
 *     responses:
 *       200:
 *         description: Paginated maintenance events
 *       403:
 *         description: Admin role required
 *   post:
 *     tags: [Admin]
 *     summary: Log a maintenance event
 *     description: Creates the event that locks the unit out of service.
 *     responses:
 *       201:
 *         description: Maintenance event created
 *       403:
 *         description: Admin role required
 */
router.get("/maintenance", safePagination(20, 100), getMaintenanceEvents);
router.post("/maintenance", createMaintenance);

/**
 * @openapi
 * /admin/maintenance/{id}/complete:
 *   patch:
 *     tags: [Admin]
 *     summary: Complete a maintenance event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event completed
 *       403:
 *         description: Admin role required
 */
router.patch("/maintenance/:id/complete", completeMaintenance);

/**
 * @openapi
 * /admin/maintenance/{vehicleId}/release:
 *   post:
 *     tags: [Admin]
 *     summary: Release a vehicle from maintenance
 *     description: Closes every open event for the unit and re-enables the fleet listing.
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle released
 *       403:
 *         description: Admin role required
 */
router.post("/maintenance/:vehicleId/release", releaseMaintenanceVehicle);

// Reports & Analytics: live executive summary aggregated across the fleet,
// booking funnel, payment ledger and renter cohorts.

/**
 * @openapi
 * /admin/reports/summary:
 *   get:
 *     tags: [Admin]
 *     summary: Executive analytics summary
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 12m, all]
 *       - in: query
 *         name: hub
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Aggregated report payload
 *       403:
 *         description: Admin role required
 */
router.get("/reports/summary", getAnalyticsSummary);

// Platform Settings & Governance: persisted config registry with a live
// governance snapshot. PATCH accepts partial sections or { reset: true }.

/**
 * @openapi
 * /admin/settings:
 *   get:
 *     tags: [Admin]
 *     summary: Platform settings registry and governance snapshot
 *     responses:
 *       200:
 *         description: Settings, registry hash, gateways and governance blocks
 *       403:
 *         description: Admin role required
 *   patch:
 *     tags: [Admin]
 *     summary: Persist platform settings
 *     description: >-
 *       Accepts partial sections (general, booking, commission, telemetry,
 *       emergency) or { "reset": true } to restore the defaults.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reset:
 *                 type: boolean
 *               general:
 *                 type: object
 *               booking:
 *                 type: object
 *               commission:
 *                 type: object
 *               telemetry:
 *                 type: object
 *               emergency:
 *                 type: object
 *     responses:
 *       200:
 *         description: Updated registry snapshot
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin role required
 */
router.get("/settings", getPlatformSettings);
router.patch("/settings", updatePlatformSettingsEntry);

// Company onboarding approval (PENDING -> APPROVED / SUSPENDED / REJECTED)

/**
 * @openapi
 * /admin/companies/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Approve, suspend or reject a company
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, APPROVED, SUSPENDED, REJECTED]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin role required
 */
router.patch(
  "/companies/:id/status",
  validate(updateCompanyStatusSchema),
  updateCompanyStatus,
);

export default router;