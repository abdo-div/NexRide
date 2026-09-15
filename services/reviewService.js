import Review from "../models/review_model.js";
import Booking from "../models/booking_model.js";
import AppError from "../utils/appError.js";

/**
 * Fetch all reviews (Supports global lookups or nested under a vehicle)
 */
export const fetchAllReviews = async (vehicleId) => {
  const filter = vehicleId ? { vehicle: vehicleId } : {};
  return await Review.find(filter).populate("customer", "name photo");
};

/**
 * Fetch single review by ID
 */
export const fetchReviewById = async (reviewId) => {
  const review = await Review.findById(reviewId).populate("customer", "name photo");
  if (!review) {
    throw new AppError("No review found with that ID", 404);
  }
  return review;
};

/**
 * Verify completed rental booking before customer leaves a review
 */
export const verifyBookingCompletion = async (customerId, vehicleId) => {
  const completedBooking = await Booking.findOne({
    user: customerId,
    car: vehicleId,
    status: "completed",
  });

  if (!completedBooking) {
    throw new AppError(
      "You can only review vehicles for which you have a completed booking.",
      403
    );
  }

  return completedBooking;
};

/**
 * Create a new review
 */
export const createNewReview = async (reviewData) => {
  return await Review.create(reviewData);
};

/**
 * Update review owned by customer
 */
export const updateCustomerReview = async (reviewId, updateData, user) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError("No review found with that ID", 404);
  }

  const isOwner = review.customer.toString() === user.id;
  const isAdmin = user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new AppError("You can only update your own reviews.", 403);
  }

  Object.assign(review, updateData);
  await review.save();
  return review;
};

/**
 * Delete review owned by customer or admin
 */
export const deleteCustomerReview = async (reviewId, user) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError("No review found with that ID", 404);
  }

  const isOwner = review.customer.toString() === user.id;
  const isAdmin = user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new AppError("You can only delete your own reviews.", 403);
  }

  await Review.findByIdAndDelete(reviewId);
  return null;
};

/**
 * Fetch reviews for a specific company tenant's fleet
 */
export const fetchCompanyFleetReviews = async (companyId) => {
  return await Review.find()
    .populate({
      path: "vehicle",
      match: { company: companyId },
      select: "make model year company",
    })
    .then((reviews) => reviews.filter((r) => r.vehicle !== null));
};

/**
 * Add company response reply to a review
 */
export const addCompanyResponseToReview = async (reviewId, responseText, companyId) => {
  if (!responseText) {
    throw new AppError("Please provide a response text", 400);
  }

  const review = await Review.findById(reviewId).populate("vehicle");
  if (!review) {
    throw new AppError("No review found with that ID", 404);
  }

  if (review.vehicle.company.toString() !== companyId.toString()) {
    throw new AppError("You can only respond to reviews left on your fleet vehicles.", 403);
  }

  review.companyResponse = {
    response: responseText,
    respondedAt: new Date(),
  };

  await review.save();
  return review;
};