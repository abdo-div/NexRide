import express from "express";
import reviewRouter from "./reviewRoutes.js";
import {
  getAllVehicles,
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
router.get("/", getAllVehicles);
router.get("/:id", validate(vehicleIdParamSchema), getVehicleById);

// -----------------------------------------------------------------------------
// AUTHENTICATED TENANT & FLEET MANAGEMENT ROUTES
// -----------------------------------------------------------------------------
router.use(protect);

// Static fleet management route — must be declared before any other /:id routes under protect
router.get(
  ["/tenant/my-fleet", "/tenant/myFleet"],
  restrictTo("company", "admin"),
  getCompanyVehicles,
);

// Add new vehicle to fleet with image multipart handling
router.post(
  "/",
  restrictTo("company", "admin"),
  uploadVehicleImages,
  validate(createVehicleSchema),
  createVehicle,
);

// Update vehicle metadata
router.patch(
  "/:id",
  restrictTo("company", "admin"),
  verifyTenantAccess("Vehicle"),
  uploadVehicleImages,
  resizeVehicleImages,
  validate(updateVehicleSchema),
  updateVehicle,
);

// Operational status toggle (AVAILABLE, MAINTENANCE, PUBLISHED, SUSPENDED, etc.)
router.patch(
  "/:id/status",
  restrictTo("company", "admin"),
  verifyTenantAccess("Vehicle"),
  validate(updateVehicleStatusSchema),
  updateVehicleStatus,
);

// Soft delete vehicle listing
router.delete(
  "/:id",
  restrictTo("company", "admin"),
  verifyTenantAccess("Vehicle"),
  validate(vehicleIdParamSchema),
  deleteVehicle,
);

export default router;
