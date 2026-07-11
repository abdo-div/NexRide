import express from "express";

import * as carController from "../controllers/carController.js";
import * as authController from "../controllers/authController.js";

import reviewRouter from "./reviewRoutes.js";
const router = express.Router();

router.use((req, res, next) => {
  console.log("🔥 CAR ROUTER HIT:", req.originalUrl);
  next();
});
// 🔗 NESTED ROUTE: Redirect any car-specific review requests straight to the review router
// Example: POST /api/v1/cars/668469a1/reviews -> Handles creating a review for this specific car

router.use("/:carId/reviews", reviewRouter);

// 🏎️ ALIASING ROUTE: Pre-fills query parameters for a quick custom filter
router
  .route("/top-5-affordable")
  .get(carController.aliasTopCars, carController.getAllCars);

// 📊 AGGREGATION PIPELINE: Financial/inventory stats for dashboard
router
  .route("/car-stats")
  .get(
    authController.protect,
    authController.restrictTo("admin", "employee"),
    carController.getCarStats,
  );

// 📅 UTILITY: See high-demand utilization mapping for a given year

router
  .route("/monthly-rental-plan/:year")
  .get(
    authController.protect,
    authController.restrictTo("admin", "employee"),
    carController.getMonthlyRentalPlan,
  );

// 📍 GEOSPATIAL SEARCH: Find available cars within a radius of a user's location
// Example: /api/v1/cars/cars-within/50/center/32.8872,13.1913/unit/km (Tripoli coords)
router
  .route("/cars-within/:distance/center/:latlng/unit/:unit")
  .get(carController.getCarsWithin);

router
  .route("/distances/:latlng/unit/:unit")
  .get(carController.getDistances);

// 🗺️ GENERAL CAR ROUTES

router
  .route("/")
  .get(carController.getAllCars)
  .post(
    authController.protect,
    authController.restrictTo("admin", "employee"),
    carController.uploadCarImages,
    carController.createCar,
  );

router
  .route("/:id")
  .get(carController.getCar)
  .patch(
    authController.protect,
    authController.restrictTo("admin", "employee"),
    carController.uploadCarImages,
    carController.resizeCarImages,
    carController.updateCar,
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    carController.deleteCar,
  );

export default router;
