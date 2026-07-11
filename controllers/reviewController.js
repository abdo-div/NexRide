import Review from "./../models/review_model.js";
import catchAsync from "../utils/catchAsync.js";
import Booking from "../models/booking_model.js";
// 🔗 1. NESTED ROUTE PREP MIDDLEWARE
// Automatically grabs the Car ID from the URL and User ID from the login session if missing
export const setCarUserIds = (req, res, next) => {
  // If the car wasn't specified in the request body, look for it in the nested URL parameters
  if (!req.body.car) req.body.car = req.params.carId;

  // The user ID always comes directly from the protected login session token
  if (!req.body.user) req.body.user = req.user.id;

  next();
};

// 📝 2. CORE CRUD CONTROLLERS

export const getAllReviews = catchAsync(async (req, res, next) => {
  let filter = {};

  if (req.params.carId) filter = { car: req.params.carId };

  const reviews = await Review.find(filter);

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: { reviews },
  });
});

export const createReview = catchAsync(async (req, res, next) => {
  const newReview = await Review.create(req.body);

  res.status(201).json({
    status: "success",
    data: { newReview },
  });
});
// Fetch an individual single review by its personal ID

export const getReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({
      status: "fail",
      message: "no review found with that id",
    });
  }

  res.status(200).json({
    status: "success",
    data: { review },
  });
});

export const updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return res.status(404).json({
      status: "fail",
      message: "no review found with that id",
    });
  }
  if (review.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(new AppError("You can only update your own reviews.", 403));
  }

  Object.assign(review, req.body);
  await review.save();

  res.status(200).json({
    status: "success",
    data: { review },
  });
});

export const deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return res.status(404).json({
      status: "fail",
      message: "no review found with that id",
    });
  }
  if (review.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(new AppError("You can only delete your own reviews.", 403));
  }

  await Review.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});
