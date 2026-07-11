import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  car: {
    type: mongoose.Schema.ObjectId,
    ref: "Car",
    required: [true, "A booking must belong to a car"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "A booking must belong to a user"],
  },
  startDate: {
    type: Date,
    required: [true, "A booking must have a start date"],
  },
  endDate: {
    type: Date,
    required: [true, "A booking must have an end date"],
    validate: {
      validator: function (value) {
        return value > this.startDate;
      },
      message: "End date ({VALUE}) must be after the start date!",
    },
  },
  totalPrice: Number,
  paid: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "active", "completed", "cancelled"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-calculate totalPrice before creating a new booking
bookingSchema.pre("save", async function () {
  if (!this.isModified("startDate") && !this.isModified("endDate")) {
    return;
  }
  if (this.totalPrice && !this.isNew) return;

  const car = await mongoose.model("Car").findById(this.car);
  if (!car) throw new Error("No car found with that ID");
  const timeDiff = Math.abs(this.endDate - this.startDate);
  const rentalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  this.totalPrice = rentalDays * car.pricePerDay;
});

// PRE-FIND MIDDLEWARE: Populate user and car details on every find query
bookingSchema.pre(/^find/, async function () {
  this.populate({
    path: "user",
    select: "name email phoneNumber",
  }).populate({
    path: "car",
  });

  // No next() needed here! Mongoose handles it via the async resolution.
});
const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
