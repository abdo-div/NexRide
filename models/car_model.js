import mongoose from "mongoose";

// Separate schema for GeoJSON point to avoid Mongoose `type` keyword collision
const pointSchema = new mongoose.Schema({
  type: { type: String, default: "Point", enum: ["Point"] },
  coordinates: [Number],
});

const carSchema = mongoose.Schema(
  {
    make: {
      type: String,
      required: [true, " a car must have a make (e.g , toyota)"],
    },
    model: {
      type: String,
      required: [true, "  a car must have a model e.g , camry"],
    },
    year: {
      type: Number,
      required: [true, "a car must have a manufacturing year "],
    },
    type: {
      type: String,
      required: [true, " specify car type "],
      enum: ["sedan", "suv", "hatchback", "sport", "luxury"],
    },
    transmission: {
      type: String,
      enum: ["automatic", "manual"],
      required: true,
    },
    pricePerDay: {
      type: Number,
      required: [true, " a car must have a daily rental price"],
    },
    available: {
      type: Boolean,
      default: true,
    },
    features: [String],
    imageCover: {
      type: String,
      required: [true, "A car must have a cover image"],
    },
    images: [String],
    ratingAverage: {
      type: Number,
      default: 4.5,
      min: [1, "rating must be above 1.0 "],
      max: [5, " rating must be below 5.0"],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: { type: Number, default: 0 },
    location: { type: pointSchema },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

carSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "car",
  localField: "_id",
});
carSchema.index({ location: "2dsphere" });
const Car = mongoose.model("Car", carSchema);
export default Car;
