import express from "express";
import reviewRouter from "./reviewRoutes.js";
import {
  getAllVehicles,
  searchVehicles,
  getVehicleById,
  getCompanyVehicles,
  createVehicle,
  updateVehicle,
  updateVehicleStatus,
  deleteVehicle,
  uploadVehicleImages,
  resizeVehicleImages,
} from "../controllers/vehicleController.js";
import {
  protect,
  restrictTo,
  verifyTenantAccess,
} from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createVehicleSchema,
  updateVehicleSchema,
  updateVehicleStatusSchema,
  vehicleIdParamSchema,
} from "../validations/vehicle.validation.js";

const router = express.Router();

// -----------------------------------------------------------------------------
// NESTED ROUTE DELEGATION
// -----------------------------------------------------------------------------
router.use("/:vehicleId/reviews", reviewRouter);

// -----------------------------------------------------------------------------
// PUBLIC MARKETPLACE ROUTES
// NOTE: Static routes MUST come before parameterized /:id routes
// -----------------------------------------------------------------------------
/**
 * @openapi
 * /cars:
 *   get:
 *     tags: [Vehicles]
 *     summary: Browse the public vehicle catalogue
 *     parameters:
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated vehicle list
 */
router.get("/", getAllVehicles);

/**
 * @openapi
 * /cars/search:
 *   get:
 *     tags: [Vehicles]
 *     summary: Filter the public vehicle catalogue
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: operationalStatus
 *         schema:
 *           type: string
 *           enum: [AVAILABLE, MAINTENANCE, SUSPENDED]
 *     responses:
 *       200:
 *         description: Matching vehicles
 */
router.get("/search", searchVehicles);

/**
 * @openapi
 * /cars/{id}:
 *   get:
 *     tags: [Vehicles]
 *     summary: Public vehicle detail
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle document
 *       404:
 *         description: Vehicle not found
 */
router.get("/:id", validate(vehicleIdParamSchema), getVehicleById);

// -----------------------------------------------------------------------------
// AUTHENTICATED TENANT & FLEET MANAGEMENT ROUTES
// -----------------------------------------------------------------------------
router.use(protect);

// Static fleet management route — must be declared before any other /:id routes under protect
/**
 * @openapi
 * /cars/tenant/my-fleet:
 *   get:
 *     tags: [Vehicles]
 *     summary: Fleet of the authenticated company
 *     responses:
 *       200:
 *         description: Company vehicle list
 *       403:
 *         description: Company or admin role required
 */
router.get(
  ["/tenant/my-fleet", "/tenant/myFleet"],
  restrictTo("company", "admin"),
  getCompanyVehicles,
);

/**
 * @openapi
 * /cars:
 *   post:
 *     tags: [Vehicles]
 *     summary: Add a vehicle to the fleet
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, brand, model, year, pricePerDay, seats, transmission, fuelType, companyId]
 *             properties:
 *               name:
 *                 type: string
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *               pricePerDay:
 *                 type: number
 *               seats:
 *                 type: integer
 *               transmission:
 *                 type: string
 *               fuelType:
 *                 type: string
 *               companyId:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Vehicle created
 *       403:
 *         description: Company or admin role required
 */
router.post(
  "/",
  restrictTo("company", "admin"),
  uploadVehicleImages,
  validate(createVehicleSchema),
  createVehicle,
);

/**
 * @openapi
 * /cars/{id}:
 *   patch:
 *     tags: [Vehicles]
 *     summary: Update vehicle metadata
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle updated
 *       403:
 *         description: Tenant access denied
 *   delete:
 *     tags: [Vehicles]
 *     summary: Soft-delete a vehicle listing
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle removed
 *       403:
 *         description: Tenant access denied
 */
router.patch(
  "/:id",
  restrictTo("company", "admin"),
  verifyTenantAccess("Vehicle"),
  uploadVehicleImages,
  resizeVehicleImages,
  validate(updateVehicleSchema),
  updateVehicle,
);

/**
 * @openapi
 * /cars/{id}/status:
 *   patch:
 *     tags: [Vehicles]
 *     summary: Change the vehicle operational status
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
 *                 enum: [AVAILABLE, MAINTENANCE, SUSPENDED]
 *               listingStatus:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, SUSPENDED]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Validation error
 *       403:
 *         description: Tenant access denied
 */
router.patch(
  "/:id/status",
  restrictTo("company", "admin"),
  verifyTenantAccess("Vehicle"),
  validate(updateVehicleStatusSchema),
  updateVehicleStatus,
);

router.delete(
  "/:id",
  restrictTo("company", "admin"),
  verifyTenantAccess("Vehicle"),
  validate(vehicleIdParamSchema),
  deleteVehicle,
);

export default router;
