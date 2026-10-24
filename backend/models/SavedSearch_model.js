import mongoose from "mongoose";

const savedSearchSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    criteria: {
      location: { type: String, trim: true, maxlength: 100, default: "" },
      type: { type: [String], enum: ["SEDAN", "SUV", "HATCHBACK", "LUXURY", "VAN", "PICKUP"], default: [] },
      transmission: { type: String, enum: ["", "MANUAL", "AUTOMATIC"], default: "" },
      fuelType: { type: String, enum: ["", "GASOLINE", "DIESEL", "ELECTRIC", "HYBRID"], default: "" },
      maxPrice: { type: Number, min: 0, max: 100000, default: null },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
    alertsEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

savedSearchSchema.index({ customerId: 1, createdAt: -1 });
savedSearchSchema.index({ customerId: 1, name: 1 }, { unique: true });
savedSearchSchema.index({ alertsEnabled: 1, "criteria.type": 1, "criteria.location": 1 });

export default mongoose.models.SavedSearch || mongoose.model("SavedSearch", savedSearchSchema);
