import express from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  listActivity,
  recordView,
  updateFavorite,
} from "../controllers/customerVehicleActivityController.js";
import {
  favoriteVehicleSchema,
  vehicleActivityParamSchema,
} from "../validations/customerVehicleActivity.validation.js";

const router = express.Router();
router.use(protect, restrictTo("customer"));
router.get("/", listActivity);
router.patch("/:vehicleId/favorite", validate(favoriteVehicleSchema), updateFavorite);
router.post("/:vehicleId/view", validate(vehicleActivityParamSchema), recordView);

export default router;
