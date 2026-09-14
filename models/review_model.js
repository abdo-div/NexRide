import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    // -------------------------------------------------------------------------
    // Core Relationships & Marketplace Verification
    // -------------------------------------------------------------------------
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "A review must be linked to a verified completed booking"],
      unique: true, // Guarantees 1 review per completed booking
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: [true, "A review must belong to a vehicle"],
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "A review must be linked to a rental company"],
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A review must belong to a customer"],
      index: true,
    },

    // -------------------------------------------------------------------------
    // Review Content
    // -------------------------------------------------------------------------
    rating: {
      type: Number,
      required: [true, "Please provide a rating between 1 and 5"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    review: {
      type: String,
      required: [true, "Review text cannot be empty"],
      trim: true,
      maxlength: [1000, "Review text cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    autoIndex: process.env.NODE_ENV !== "production",
  }
);

// Prevent duplicate reviews: Ensure a customer can only review a specific vehicle once per user account
reviewSchema.index({ vehicleId: 1, customerId: 1 }, { unique: true });

// -----------------------------------------------------------------------------
// Hooks & Middleware
// -----------------------------------------------------------------------------

// Populate customer details on find queries
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "customerId",
    select: "name photo",
  });
  next();
});

// -----------------------------------------------------------------------------
// Static Methods: Average Rating Aggregation
// -----------------------------------------------------------------------------

reviewSchema.statics.calcAverageRatings = async function (vehicleId) {
  const stats = await this.aggregate([
    { $match: { vehicleId } },
    {
      $group: {
        _id: "$vehicleId",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.model("Vehicle").findByIdAndUpdate(vehicleId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: Math.round(stats[0].avgRating * 10) / 10,
    });
  } else {
    await mongoose.model("Vehicle").findByIdAndUpdate(vehicleId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// Recalculate ratings after saving a new review
reviewSchema.post("save", function () {
  this.constructor.calcAverageRatings(this.vehicleId).catch((err) =>
    console.error("Failed to update vehicle ratings:", err)
  );
});

// Recalculate ratings when a review is updated or deleted
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.clone().findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  if (this.r) {
    await this.r.constructor.calcAverageRatings(this.r.vehicleId);
  }
});

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;