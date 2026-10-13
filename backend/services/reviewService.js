import Review from "../models/review_model.js";
import Booking from "../models/booking_model.js";
import AppError from "../utils/appError.js";
import mongoose from "mongoose";

/**
 * Fetch all reviews (Supports global lookups or nested under a vehicle)
 */
export const fetchAllReviews = async (vehicleId) => {
  const filter = vehicleId ? { vehicleId } : {};
  return await Review.find(filter);
};

/**
 * Fetch single review by ID
 */
export const fetchReviewById = async (reviewId) => {
  const review = await Review.findById(reviewId);
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
    customerId,
    vehicleId,
    bookingStatus: "COMPLETED",
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
 * Customer-facing review state for one booking. This keeps the UI honest:
 * only the booking owner can inspect it, only completed rentals are eligible,
 * and an existing review is returned so duplicate submissions are prevented.
 */
export const fetchReviewEligibility = async (customerId, bookingId) => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError("Please provide a valid booking identifier.", 400);
  }
  const booking = await Booking.findOne({ _id: bookingId, customerId });
  if (!booking) {
    throw new AppError("No booking found for this customer.", 404);
  }

  const vehicleId = booking.vehicleId?._id ?? booking.vehicleId;
  const existing = await Review.findOne({
    $or: [
      { bookingId },
      { vehicleId, customerId },
    ],
  });
  return {
    eligible: booking.bookingStatus === "COMPLETED" && !existing,
    completed: booking.bookingStatus === "COMPLETED",
    reviewed: Boolean(existing),
    review: existing ?? null,
    vehicleId,
    companyId: booking.companyId?._id ?? booking.companyId,
  };
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

  const customerVal = review.customerId;
  const reviewCustId = customerVal?._id
    ? customerVal._id.toString()
    : customerVal?.toString();
  const isOwner = reviewCustId === user.id.toString();
  const isAdmin = user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new AppError("You can only update your own reviews.", 403);
  }

  // Only allow updating safe fields
  if (updateData.rating !== undefined) review.rating = updateData.rating;
  if (updateData.review !== undefined) review.review = updateData.review;
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

  const customerVal = review.customerId;
  const reviewCustId = customerVal?._id
    ? customerVal._id.toString()
    : customerVal?.toString();
  const isOwner = reviewCustId === user.id.toString();
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
  return await Review.find({ companyId });
};

/**
 * Add company response reply to a review
 */
export const addCompanyResponseToReview = async (
  reviewId,
  responseText,
  companyId,
) => {
  if (!responseText) {
    throw new AppError("Please provide a response text", 400);
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError("No review found with that ID", 404);
  }

  const compVal = review.companyId;
  const reviewCompId = compVal?._id
    ? compVal._id.toString()
    : compVal?.toString();

  if (!companyId || reviewCompId !== companyId.toString()) {
    throw new AppError(
      "You can only respond to reviews left on your fleet vehicles.",
      403,
    );
  }

  review.companyResponse = {
    response: responseText,
    respondedAt: new Date(),
  };

  await review.save();
  return review;
};
