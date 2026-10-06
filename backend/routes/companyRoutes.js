import express from "express";
import {
  getAllCompanies,
  getCompanyById,
  getCompanyByStorefrontIdentifier,
  createCompany,
  updateMyCompany,
  updateCompanyCommission,
  toggleCompanyVerification,
  deleteCompany,
} from "../controllers/companyController.js";
import { registerCompanyOwner } from "../controllers/companyRegistrationController.js";
import { getCompanyDashboard } from "../controllers/companyDashboardController.js";
import { getCompanyBookings } from "../controllers/companyBookingsController.js";
import { getCompanyFleet } from "../controllers/companyFleetController.js";
import { getCompanyVehicleDetail } from "../controllers/companyVehicleController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { validateSubdomain } from "../middlewares/subdomainValidator.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  getCompanyMaintenanceEvents,
  getCompanyMaintenanceSummary,
  createCompanyMaintenance,
  completeCompanyMaintenance,
  releaseCompanyMaintenanceVehicle,
} from "../controllers/companyMaintenanceController.js";
import {
  createCompanySchema,
  updateCompanySchema,
  updateCommissionSchema,
  toggleVerificationSchema,
} from "../validations/company.validation.js";

const router = express.Router();

// -----------------------------------------------------------------------------
// PUBLIC MARKETPLACE & STOREFRONT ROUTES
// -----------------------------------------------------------------------------
/**
 * @openapi
 * /companies:
 *   get:
 *     tags: [Companies]
 *     summary: List approved marketplace fleet operators
 *     responses:
 *       200:
 *         description: Company list
 */
router.get("/", getAllCompanies);

/**
 * @openapi
 * /companies/storefront/{identifier}:
 *   get:
 *     tags: [Companies]
 *     summary: Resolve a company by public storefront identifier
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company storefront payload
 *       404:
 *         description: Storefront not found
 */
router.get("/storefront/:identifier", getCompanyByStorefrontIdentifier);

/**
 * @openapi
 * /companies/dashboard:
 *   get:
 *     tags: [Companies]
 *     summary: Tenant-scoped operations dashboard for the authenticated company
 *     description: >-
 *       Aggregates the operator's own fleet, bookings, revenue and payout
 *       posture from the real ledgers. The tenant is resolved from the session
 *       (never from the query string); crafted before /:id so "dashboard" is
 *       not captured as a company identifier.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 3m, 12m]
 *     responses:
 *       200:
 *         description: Company dashboard summary
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Company or admin role required
 */
router.get(
  "/dashboard",
  protect,
  restrictTo("company", "admin"),
  getCompanyDashboard,
);

/**
 * @openapi
 * /companies/bookings:
 *   get:
 *     tags: [Companies]
 *     summary: Tenant-scoped bookings & dispatches register for the authenticated company
 *     description: >-
 *       Returns the tenant's booking summary deck, fleet filter options and a
 *       paginated, searchable list of its own bookings. The tenant is resolved
 *       from the session (never from the query string); crafted before /:id so
 *       "bookings" is not captured as a company identifier.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [ALL, UPCOMING, HANDOVER]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED]
 *       - in: query
 *         name: payment
 *         schema:
 *           type: string
 *           enum: [PAID, PENDING, FAILED, REFUNDED]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: vehicleId
 *         schema:
 *           type: string
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Company bookings summary + page
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Company or admin role required
 */
router.get(
  "/bookings",
  protect,
  restrictTo("company", "admin"),
  getCompanyBookings,
);

/**
 * @openapi
 * /companies/fleet:
 *   get:
 *     tags: [Companies]
 *     summary: Tenant-scoped fleet register for the authenticated company
 *     description: >-
 *       Returns the fleet operator's own vehicle register — fleet posture
 *       deck (total / available / rented / maintenance / draft) plus a
 *       searchable, filtered, paginated list. The tenant is resolved from the
 *       session, never from the query string, so "fleet" is not captured as a
 *       company identifier. Admins may target another company via ?companyId=.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Free-text search over make, model, pickup location, city or registry code (NR-VH-...)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [rented, maintenance, draft, available]
 *         description: Fleet display-state filter
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [sedan, suv, luxury, commercial]
 *       - in: query
 *         name: transmission
 *         schema:
 *           type: string
 *           enum: [automatic, manual]
 *       - in: query
 *         name: fuel
 *         schema:
 *           type: string
 *           enum: [petrol, hybrid, diesel, electric]
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Company fleet summary + page
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Company or admin role required
 */
router.get(
  "/fleet",
  protect,
  restrictTo("company", "admin"),
  getCompanyFleet,
);

/**
 * @openapi
 * /companies/fleet/{vehicleId}:
 *   get:
 *     tags: [Companies]
 *     summary: Tenant-scoped vehicle dossier for the authenticated company
 *     description: >-
 *       Returns the full, real operations dossier for one of the operator's
 *       own vehicles — specs and pricing from the vehicle document, and
 *       revenue, utilization, dispatch calendar and trip history computed from
 *       the vehicle's own booking ledger. Re-scoped to the session tenant, so
 *       a company can never read another operator's unit. Admins may target
 *       another company via ?companyId=.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Free-text search over the vehicle's own trips (customer, pickup, NX-... reference)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vehicle dossier
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Company or admin role required
 *       404:
 *         description: Vehicle not found in this tenant's fleet
 */
router.get(
  "/fleet/:vehicleId",
  protect,
  restrictTo("company", "admin"),
  getCompanyVehicleDetail,
);

/**
 * @openapi
 * /companies/maintenance:
 *   get:
 *     tags: [Companies]
 *     summary: Tenant-scoped maintenance ledger for the authenticated company
 *     description: >-
 *       Returns the operator's own maintenance-event ledger — every record is
 *       scoped to the session tenant, never read from the query string. Crafted
 *       before /:id so "maintenance" is not captured as a company identifier.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [SCHEDULED, IN_PROGRESS, COMPLETED, OVERDUE, ALL] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: priority
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Maintenance events + pagination
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Company or admin role required
 */
router.get(
  "/maintenance",
  protect,
  restrictTo("company", "admin"),
  getCompanyMaintenanceEvents,
);

/**
 * @openapi
 * /companies/maintenance/summary:
 *   get:
 *     tags: [Companies]
 *     summary: Tenant-scoped fleet health + maintenance summary
 *     responses:
 *       200:
 *         description: Maintenance summary deck
 *       403:
 *         description: Company or admin role required
 */
router.get(
  "/maintenance/summary",
  protect,
  restrictTo("company", "admin"),
  getCompanyMaintenanceSummary,
);

/**
 * @openapi
 * /companies/maintenance:
 *   post:
 *     tags: [Companies]
 *     summary: Schedule a maintenance event for the tenant's own fleet
 *     responses:
 *       201:
 *         description: Maintenance event created
 *       404:
 *         description: Vehicle not found in this tenant's fleet
 *       409:
 *         description: Conflicting confirmed booking overlaps the window
 */
router.post(
  "/maintenance",
  protect,
  restrictTo("company", "admin"),
  createCompanyMaintenance,
);

/**
 * @openapi
 * /companies/maintenance/{id}/complete:
 *   patch:
 *     tags: [Companies]
 *     summary: Complete one of the tenant's maintenance events
 *     responses:
 *       200:
 *         description: Maintenance event completed
 *       404:
 *         description: Maintenance event not found
 */
router.patch(
  "/maintenance/:id/complete",
  protect,
  restrictTo("company", "admin"),
  completeCompanyMaintenance,
);

/**
 * @openapi
 * /companies/maintenance/{vehicleId}/release:
 *   post:
 *     tags: [Companies]
 *     summary: Re-enable one of the tenant's quarantined vehicles
 *     responses:
 *       200:
 *         description: Vehicle released
 *       404:
 *         description: Vehicle not found
 */
router.post(
  "/maintenance/:vehicleId/release",
  protect,
  restrictTo("company", "admin"),
  releaseCompanyMaintenanceVehicle,
);

/**
 * @openapi
 * /companies/{id}:
 *   get:
 *     tags: [Companies]
 *     summary: Public company profile
 *     description: >-
 *       Exposes only publicly visible company fields; owner contact details
 *       and internal flags are never returned.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company document
 *       404:
 *         description: Company not found
 */
router.get("/:id", getCompanyById);

// -----------------------------------------------------------------------------
// PROTECTED TENANT & ADMIN ROUTES
// -----------------------------------------------------------------------------
router.use(protect);

// Self-service company onboarding. Any authenticated user (incl. customers)
// may request an account upgrade; no restrictTo here so roles can self-register.
/**
 * @openapi
 * /companies/register:
 *   post:
 *     tags: [Companies]
 *     summary: Request a company (fleet operator) account
 *     description: Any authenticated user may self-register an operator account.
 *     responses:
 *       201:
 *         description: Company account created
 *       400:
 *         description: Validation error
 */
router.post("/register", registerCompanyOwner);

/**
 * @openapi
 * /companies:
 *   post:
 *     tags: [Companies]
 *     summary: Create a company record
 *     responses:
 *       201:
 *         description: Company created
 *       403:
 *         description: Company or admin role required
 */
router.post(
  "/",
  restrictTo("company", "admin"),
  validateSubdomain,
  validate(createCompanySchema),
  createCompany,
);

/**
 * @openapi
 * /companies/update-my-company:
 *   patch:
 *     tags: [Companies]
 *     summary: Update the authenticated company's profile
 *     responses:
 *       200:
 *         description: Company updated
 *       403:
 *         description: Company role required
 */
router.patch(
  ["/update-my-company", "/updateMyCompany"],
  restrictTo("company"),
  validateSubdomain,
  validate(updateCompanySchema),
  updateMyCompany,
);

// -----------------------------------------------------------------------------
// PLATFORM ADMIN ONLY ROUTES
// -----------------------------------------------------------------------------
/**
 * @openapi
 * /companies/{id}/commission:
 *   patch:
 *     tags: [Admin]
 *     summary: Set a company commission rate
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
 *             required: [commissionRate]
 *             properties:
 *               commissionRate:
 *                 type: number
 *     responses:
 *       200:
 *         description: Commission updated
 *       403:
 *         description: Admin role required
 */
router.patch(
  "/:id/commission",
  restrictTo("admin"),
  validate(updateCommissionSchema),
  updateCompanyCommission,
);

/**
 * @openapi
 * /companies/{id}/verify:
 *   patch:
 *     tags: [Admin]
 *     summary: Toggle company verification
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification state changed
 *       403:
 *         description: Admin role required
 */
router.patch(
  "/:id/verify",
  restrictTo("admin"),
  validate(toggleVerificationSchema),
  toggleCompanyVerification,
);

/**
 * @openapi
 * /companies/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a company
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company deleted
 *       403:
 *         description: Admin role required
 */
router.delete("/:id", restrictTo("admin"), deleteCompany);

export default router;
