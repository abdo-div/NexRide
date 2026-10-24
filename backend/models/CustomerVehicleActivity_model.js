import mongoose from "mongoose";

const customerVehicleActivitySchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    favorite: { type: Boolean, default: false },
    favoritedAt: { type: Date, default: null },
    lastViewedAt: { type: Date, default: null },
    viewCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

customerVehicleActivitySchema.index(
  { customerId: 1, vehicleId: 1 },
  { unique: true },
);
customerVehicleActivitySchema.index({ customerId: 1, favorite: 1, favoritedAt: -1 });
customerVehicleActivitySchema.index({ customerId: 1, lastViewedAt: -1 });

export default mongoose.models.CustomerVehicleActivity ||
  mongoose.model("CustomerVehicleActivity", customerVehicleActivitySchema);
