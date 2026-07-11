import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  review: { type: String, required: [true, "reviw text cannot be empty"] },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  car: {
    type: mongoose.Schema.ObjectId,
    ref: "Car",
    required: [true, "Review must belong to a car"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Review must belong to a user."],
  },
  createdAt: { type: Date, default: Date.now },
});

// Prevent duplicate reviews: Ensure a user can only review a specific car once
reviewSchema.index({ car: 1, user: 1 }, { unique: true });

// PRE-FIND MIDDLEWARE: Populate reviewer name
reviewSchema.pre(/^find/, function () {
  this.populate({
    path: "user",
    select: "name",
  });
});

// STATIC METHOD: Compute and update average rating on the Car document
reviewSchema.statics.calcAverageRatings = async function (carId) {
  const stats = await this.aggregate([
    { $match: { car: carId } },
    {
      $group: {
        _id: "$car",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.model("Car").findByIdAndUpdate(carId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await mongoose.model("Car").findByIdAndUpdate(carId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// POST-SAVE HOOK: Call calculation method after a new review is saved
reviewSchema.post("save", function () {
  this.constructor.calcAverageRatings(this.car).catch((err) =>
    console.error("Failed to update ratings:", err)
  );
});

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
export default Review;
