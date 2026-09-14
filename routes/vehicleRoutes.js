import express from "express";
import reviewRouter from "./review_routes.js";
import { restrictTo } from "../controllers/authController.js";
const router = express.Router();

// -----------------------------------------------------------------------------
// NESTED ROUTE DELEGATION
// -----------------------------------------------------------------------------
// Redirects /api/v1/vehicles/:vehicleId/reviews directly to the Review Router
router.use("/:vehicleId/reviews", reviewRouter);

router.get("/", getAllVehicles);

router.get("/:id", getVehicleById);

router.use(protect);

router.get(
  "/tenant/my-fleet",
  restrictTo("company", "admin"),
  getCompanyVehicles,
);

//add new vehicle to company inventory

router.post("/", restrictTo("company", "admin"), createVehicle);

router.patch(
  "/:id",
  restrictTo("company", "admin"),
  verifyTenantAccess("Vehicle"),
  updateVehicle,
);

// Dedicated endpoint for operational & listing status toggles (AVAILABLE, MAINTENANCE, PUBLISHED, etc.)
router.patch(
  "/:id/status",
  restrictTo("company", "admin"),
  verifyTenantAccess("Vehicle"),
  updateVehicleStatus,
);

// Soft delete vehicle (preserves historical booking integrity)
router.delete(
  "/:id",
  restrictTo("company", "admin"),
  verifyTenantAccess("Vehicle"),
  deleteVehicle,
);

export default router;
