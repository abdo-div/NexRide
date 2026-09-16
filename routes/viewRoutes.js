import express from "express";
import Vehicle from "../models/vehicle_model.js";
import catchAsync from "../utils/catchAsync.js";
import { isLoggedIn, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

function mapCarForView(car) {
  if (!car) return car;
  return {
    ...car,
    pricePerDay: car.pricePerDay ?? car.dailyPrice,
    available:
      car.available !== undefined
        ? car.available
        : car.operationalStatus === "AVAILABLE",
    imageCover:
      car.imageCover ||
      (car.photos && car.photos.length > 0 ? car.photos[0] : "car-1.jpg"),
    images:
      car.images && car.images.length > 0
        ? car.images
        : car.photos && car.photos.length > 0
        ? car.photos
        : ["car-1.jpg"],
    ratingAverage: car.ratingAverage ?? car.ratingsAverage ?? 4.5,
    ratingsQuantity: car.ratingsQuantity ?? 0,
    features: car.features || (car.description ? [car.description] : []),
  };
}

router.use(isLoggedIn);

router.get(
  "/",
  catchAsync(async (req, res) => {
    const rawCars = await Vehicle.find().limit(8).lean();
    const cars = rawCars.map(mapCarForView);
    const availableCount = cars.filter((car) => car.available).length;
    res.status(200).render("overview", { cars, availableCount });
  }),
);

router.get(
  "/fleet",
  catchAsync(async (req, res) => {
    const rawCars = await Vehicle.find().lean();
    const cars = rawCars.map(mapCarForView);
    res.status(200).render("fleet", { cars });
  }),
);

router.get(
  "/car/:id",
  catchAsync(async (req, res) => {
    const car = await Vehicle.findById(req.params.id).lean();
    if (!car)
      return res.status(404).render("error", { msg: "Vehicle not found" });
    res.status(200).render("car", { car: mapCarForView(car) });
  }),
);

router.get("/login", (req, res) => res.status(200).render("login"));
router.get("/signup", (req, res) => res.status(200).render("login"));
router.get("/forgot-password", (req, res) =>
  res.status(200).render("forgotPassword"),
);

router.get("/me", protect, (req, res) => res.status(200).render("account"));
router.get("/account", protect, (req, res) =>
  res.status(200).render("account"),
);
router.get("/my-rentals", protect, (req, res) =>
  res.status(200).render("myRentals"),
);
router.get("/create-offer", protect, (req, res) =>
  res.status(200).render("createCarOffer"),
);

export default router;
