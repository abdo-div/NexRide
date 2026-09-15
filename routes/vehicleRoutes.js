import express from "express";
import reviewRouter from "./review_routes.js";
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
} from "../middleware/authMiddleware.js";

const router = express.Router();

// -----------------------------------------------------------------------------
// NESTED ROUTE DELEGATION
// -----------------------------------------------------------------------------
router.use("/:vehicleId/reviews", reviewRouter);

// -----------------------------------------------------------------------------
// PUBLIC MARKETPLACE ROUTES
// -----------------------------------------------------------------------------
router.get("/", getAllVehicles);
router.get("/:id", getVehicleById);

// -----------------------------------------------------------------------------
// AUTHENTICATED TENANT & FLEET MANAGEMENT ROUTES
// -----------------------------------------------------------------------------
router.use(protect);

router.get(
  "/tenant/my-fleet",
  restrictTo("company", "admin"),
  getCompanyVehicles
);

// Add new vehicle to fleet with image multipart handling
router.post(
  "/",
  restrictTo("company", "admin"),
  uploadVehicleImages,
  createVehicle
);

// Update vehicle metadata
router.patch(
  "/:id",
  restrictTo("company", "admin"),
  verifyTenantAccess("Vehicle"),
  uploadVehicleImages,
  resizeVehicleImages,
  updateVehicle
);

// Operational status toggle (AVAILABLE, MAINTENANCE, PUBLISHED)
router.patch(
  "/:id/status",
  restrictTo("company", "admin"),
  verifyTenantAccess("Vehicle"),
  updateVehicleStatus
);

// Soft delete vehicle listing
router.delete(
  "/:id",
  restrictTo("company", "admin"),
  verifyTenantAccess("Vehicle"),
  deleteVehicle
);

export default router;