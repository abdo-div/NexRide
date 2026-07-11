import multer from "multer";
import sharp from "sharp";
import mongoose from "mongoose";
import Car from "./../models/car_model.js";
import catchAsync from "./../utils/catchAsync.js";
import AppError from "./../utils/appError.js";
import APIFeatures from "../utils/APIFeatures.js";

// 🏎️ 1. ALIASING MIDDLEWARE
// Automatically injects query filters for sorting by lowest price and highest rating
export const aliasTopCars = catchAsync(async (req, res, next) => {
  Object.defineProperty(req, "query", {
    value: {
      ...req.query,
      limit: "5",
      sort: "pricePerDay,-ratingsAverage",
      fields: "make,model,year,pricePerDay,ratingsAverage,type,transmission",
    },
    writable: true,
    configurable: true,
  });

  console.log("🔥 BEFORE NEXT");
  next();
  console.log("🔥 AFTER NEXT (should still print)");
});

export const createCar = catchAsync(async (req, res, next) => {
  // Extract only the fields we need — explicitly exclude `location` to prevent
  // Mongoose from creating a default subdocument that breaks the 2dsphere index
  const { lng, lat, ...carData } = req.body;

  // Build location GeoJSON from lng/lat fields if provided
  if (lng && lat) {
    carData.location = {
      type: "Point",
      coordinates: [Number(lng), Number(lat)],
    };
  }

  // Normalize features — multer sends multiple checkboxes as array
  if (carData.features && !Array.isArray(carData.features)) {
    carData.features = [carData.features];
  }

  // Set temporary imageCover placeholder so Mongoose validation passes
  // (multer puts the actual file in req.files, not req.body)
  carData.imageCover = carData.imageCover || "temp-cover.jpeg";

  const newCar = await Car.create(carData);

  // If a cover image was uploaded, resize and update
  if (req.files && req.files.imageCover) {
    const filename = `car-${newCar._id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`public/cars/${filename}`);

    newCar.imageCover = filename;
  }

  // If gallery images were uploaded, resize them all
  if (req.files && req.files.images) {
    const gallery = await Promise.all(
      req.files.images.map(async (file, i) => {
        const filename = `car-${newCar._id}-${Date.now()}-${i + 1}.jpeg`;
        await sharp(file.buffer)
          .resize(2000, 1333)
          .toFormat("jpeg")
          .jpeg({ quality: 85 })
          .toFile(`public/cars/${filename}`);
        return filename;
      }),
    );
    newCar.images = gallery;
  }

  if (req.files && (req.files.imageCover || req.files.images)) {
    await newCar.save({ validateBeforeSave: false });
  }

  // Redirect browser to the fleet page if HTML form submission
  if (req.accepts("html")) {
    return res.redirect("/fleet");
  }

  res.status(201).json({
    status: "success",
    data: { car: newCar },
  });
});

export const getCar = catchAsync(async (req, res, next) => {
  const car = await Car.findById(req.params.id).populate({
    path: "reviews",
    select: "review rating user -car",
  });
  if (!car) {
    return res
      .status(404)
      .json({ status: "fail", message: "no car found with that id" });
  }
  res.status(200).json({
    status: "success",
    data: { car },
  });
});

export const updateCar = catchAsync(async (req, res, next) => {
  const car = await Car.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!car) {
    return res
      .status(404)
      .json({ status: "fail", message: "no car found with that id" });
  }
  res.status(200).json({
    status: "success",
    data: { car },
  });
});

export const getAllCars = catchAsync(async (req, res, next) => {
  //  EXECUTE THE PIPELINE IN 2 LINES!
  const features = new APIFeatures(Car.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  console.log("🔥 GET ALL CARS HIT");
  // Await the finalized query built inside the class instance
  const cars = await features.query;
  console.log("FINAL QUERY LIMIT:", req.query.limit);
  // Send the final server response
  res.status(200).json({
    status: "success",
    results: cars.length,
    data: { cars },
  });
});

export const deleteCar = catchAsync(async (req, res, next) => {
  const car = await Car.findByIdAndDelete(req.params.id);

  if (!car) {
    return res
      .status(404)
      .json({ status: "fail", message: "no car found with that id" });
  }
  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const getCarStats = catchAsync(async (req, res, next) => {
  const stats = await Car.aggregate([
    {
      $match: { ratingAverage: { $gte: 2.0 } },
    },
    {
      $group: {
        _id: { $toUpper: "$type" },
        numCars: { $sum: 1 },
        avgPrice: { $avg: "$pricePerDay" },
        minPrice: { $min: "$pricePerDay" },
        maxPrice: { $max: "$pricePerDay" },
        avgRating: { $avg: "$ratingAverage" },
      },
    },
    { $sort: { avgPrice: 1 } },
  ]);
  res.status(200).json({
    status: "success",
    data: { stats },
  });
});

// Assuming you have your bookings or rentals model available to aggregate
// If this aggregation runs directly on the Car document's rental history, adjust the field names!
export const getMonthlyRentalPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // Convert string parameter to a number (e.g., 2026)

  // Example: Aggregating on the dates cars are booked/rented out
  const plan = await mongoose.model("Booking").aggregate([
    {
      // 1. Unwind an array of booking dates if you store them as an array,
      // or match directly if you match startDates
      $match: {
        startDate: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      // 2. Group by the month of the rental
      $group: {
        _id: { $month: "$startDate" },
        numCarRentals: { $sum: 1 },
        cars: { $push: "$car" }, // Tracks which cars were rented
        totalRevenue: { $sum: "$totalPrice" }, // Optional: tracks money earned
      },
    },
    {
      // 3. Add fields to make the response look pretty
      $addFields: { month: "$_id" },
    },
    {
      // 4. Project out the old raw ID field
      $project: { _id: 0 },
    },
    {
      // 5. Sort chronologically from January down to December
      $sort: { month: 1 },
    },
  ]);

  res.status(200).json({
    status: "success",
    results: plan.length,
    data: {
      plan,
    },
  });
});

// 📍 1. Find cars within a specific radius circle
export const getCarsWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  // MongoDB expects radius in radians. Divide distance by the earth's radius:
  // Earth's radius: 3963.2 miles or 6378.1 kilometers
  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new AppError(
        "Please provide latitude and longitude in the format lat,lng.",
        400,
      ),
    );
  }

  const cars = await Car.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: "success",
    results: cars.length,
    data: {
      data: cars,
    },
  });
});

// 📍 2. Calculate the distance to ALL cars from a specific point
export const getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  if (!lat || !lng) {
    return next(
      new AppError(
        "Please provide latitude and longitude in the format lat,lng.",
        400,
      ),
    );
  }

  // Multiplier to convert MongoDB meters output into Miles or Kilometers
  const multiplier = unit === "mi" ? 0.000621371 : 0.001;

  const distances = await Car.aggregate([
    {
      // $geoNear MUST be the very first stage in an aggregation pipeline!
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng * 1, lat * 1], // Convert strings to numbers
        },
        distanceField: "distance",
        distanceMultiplier: multiplier,
      },
    },
    {
      // Keep only the car metadata and the calculated distance field
      $project: {
        make: 1,
        model: 1,
        distance: 1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      data: distances,
    },
  });
});
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// 🌟 Accept 1 cover image and a maximum gallery array of 3 images
export const uploadCarImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 3 },
]);

export const resizeCarImages = catchAsync(async (req, res, next) => {
  // If there are no images uploaded at all, skip to next middleware
  if (!req.files) return next();

  // 1) Process the main cover image
  req.body.imageCover = `car-${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333) // 3:2 ratio for wide car shots
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/cars/${req.body.imageCover}`);

  // 2) Process the gallery array images
  req.body.images = [];

  // We use Promise.all because map creates an array of promises.
  // This executes the image processing concurrently instead of blocking the loop!
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `car-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat("jpeg")
        .jpeg({ quality: 85 })
        .toFile(`public/cars/${filename}`);

      // Push filename string into the array that will go to req.body
      req.body.images.push(filename);
    }),
  );

  next();
});
