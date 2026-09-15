import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import * as reviewService from "../services/reviewService.js";

/**
 * Auto-injects vehicleId from nested params and customer ID from req.user
 */
export const setVehicleAndCustomerIds = (req, res, next) => {
  if (!req.body.vehicle) req.body.vehicle = req.params.vehicleId;
  if (!req.body.customer) req.body.customer = req.user.id;
  next();
};

/**
 * Verifies customer completed a booking before posting
 */
export const verifyCompletedBooking = catchAsync(async (req, res, next) => {
  await reviewService.verifyBookingCompletion(req.user.id, req.body.vehicle);
  next();
});

export const getAllReviews = catchAsync(async (req, res, next) => {
  const reviews = await reviewService.fetchAllReviews(req.params.vehicleId);

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: { reviews },
  });
});

export const getReviewById = catchAsync(async (req, res, next) => {
  const review = await reviewService.fetchReviewById(req.params.id);

  res.status(200).json({
    status: "success",
    data: { review },
  });
});

export const createReview = catchAsync(async (req, res, next) => {
  const newReview = await reviewService.createNewReview(req.body);

  res.status(201).json({
    status: "success",
    data: { review: newReview },
  });
});

export const updateReview = catchAsync(async (req, res, next) => {
  const review = await reviewService.updateCustomerReview(
    req.params.id,
    req.body,
    req.user
  );

  res.status(200).json({
    status: "success",
    data: { review },
  });
});

export const deleteReview = catchAsync(async (req, res, next) => {
  await reviewService.deleteCustomerReview(req.params.id, req.user);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const getCompanyReviews = catchAsync(async (req, res, next) => {
  const companyId = req.tenantId || req.user.company;
  const reviews = await reviewService.fetchCompanyFleetReviews(companyId);

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: { reviews },
  });
});

export const addCompanyResponse = catchAsync(async (req, res, next) => {
  const companyId = req.tenantId || req.user.company;
  const review = await reviewService.addCompanyResponseToReview(
    req.params.id,
    req.body.response,
    companyId
  );

  res.status(200).json({
    status: "success",
    data: { review },
  });
});