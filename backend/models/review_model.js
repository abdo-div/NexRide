import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    // -------------------------------------------------------------------------
    // Core Relationships & Marketplace Verification
    // -------------------------------------------------------------------------
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [
        true,
        "A review must be linked to a verified completed booking",
      ],
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
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number from 1 to 5",
      },
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
  },
);

// Prevent duplicate reviews: Ensure a customer can only review a specific vehicle once per user account
reviewSchema.index({ vehicleId: 1, customerId: 1 }, { unique: true });

// -----------------------------------------------------------------------------
// Hooks & Middleware
// -----------------------------------------------------------------------------

// Populate customer details on find queries
reviewSchema.pre("validate", async function () {
  if (!this.isNew && !this.isModified("bookingId")) return;

  const booking = await mongoose
    .model("Booking")
    .findById(this.bookingId);

  if (!booking) throw new Error("A review must reference an existing booking");
  if (booking.bookingStatus !== "COMPLETED") {
    throw new Error("Only completed bookings can be reviewed");
  }

  const bookingCustId = booking.customerId?._id
    ? booking.customerId._id.toString()
    : booking.customerId?.toString();
  const bookingVehId = booking.vehicleId?._id
    ? booking.vehicleId._id.toString()
    : booking.vehicleId?.toString();
  const bookingCompId = booking.companyId?._id
    ? booking.companyId._id.toString()
    : booking.companyId?.toString();

  const thisCustId = this.customerId?._id
    ? this.customerId._id.toString()
    : this.customerId?.toString();
  const thisVehId = this.vehicleId?._id
    ? this.vehicleId._id.toString()
    : this.vehicleId?.toString();
  const thisCompId = this.companyId?._id
    ? this.companyId._id.toString()
    : this.companyId?.toString();

  if (
    bookingCustId !== thisCustId ||
    bookingVehId !== thisVehId ||
    bookingCompId !== thisCompId
  ) {
    throw new Error("Review relationships must match the booking");
  }
});

reviewSchema.pre(/^find/, function () {
  this.populate({
    path: "customerId",
    select: "name photo",
  });
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
  this.constructor
    .calcAverageRatings(this.vehicleId)
    .catch((err) => console.error("Failed to update vehicle ratings:", err));
});

// Recalculate ratings when a review is updated or deleted
reviewSchema.pre(/^findOneAnd/, async function () {
  this.r = await this.clone().findOne();
});

reviewSchema.post(/^findOneAnd/, async function () {
  if (this.r) {
    await this.r.constructor.calcAverageRatings(this.r.vehicleId);
  }
});

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;
