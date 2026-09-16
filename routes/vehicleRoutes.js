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
router.get("/:id", getVehicleById);

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
  createVehicle,
);

// Update vehicle metadata
router.patch(
  "/:id",
  restrictTo("company", "admin"),
  verifyTenantAccess("Vehicle"),
  uploadVehicleImages,
  resizeVehicleImages,
  updateVehicle,
);

// Operational status toggle (AVAILABLE, MAINTENANCE, PUBLISHED, SUSPENDED, etc.)
router.patch(
  "/:id/status",
  restrictTo("company", "admin"),
  verifyTenantAccess("Vehicle"),
  updateVehicleStatus,
);

// Soft delete vehicle listing
router.delete(
  "/:id",
  restrictTo("company", "admin"),
  verifyTenantAccess("Vehicle"),
  deleteVehicle,
);

export default router;
