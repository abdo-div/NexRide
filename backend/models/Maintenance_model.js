import mongoose from "mongoose";

const maintenanceEventSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: [true, "A maintenance event must reference a vehicle"],
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "A maintenance event must reference the owning company"],
      index: true,
    },
    category: {
      type: String,
      required: [true, "maintenance category is required"],
      enum: {
        values: [
          "ROUTINE_SERVICE",
          "OIL_FILTER",
          "TIRES",
          "BRAKES",
          "DIAGNOSTICS",
          "BALLISTIC_ARMOR",
          "DETAILING",
          "OTHER",
        ],
        message: "invalid maintenance category",
      },
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: ["CRITICAL", "HIGH", "ROUTINE"],
        message: "invalid maintenance priority",
      },
      default: "ROUTINE",
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["SCHEDULED", "IN_PROGRESS", "COMPLETED"],
        message: "invalid maintenance status",
      },
      default: "SCHEDULED",
      index: true,
    },
    triggerReason: {
      type: String,
      required: [true, "maintenance requires a diagnostic trigger reason"],
      trim: true,
      maxlength: [200, "trigger reason cannot exceed 200 characters"],
    },
    detail: {
      type: String,
      trim: true,
      maxlength: [2000, "maintenance detail cannot exceed 2000 characters"],
      default: "",
    },
    workshop: {
      type: String,
      trim: true,
      default: "",
    },
    technician: {
      type: String,
      trim: true,
      default: "",
    },
    intakeDate: {
      type: Date,
      default: Date.now,
    },
    estReturnDate: {
      type: Date,
      default: null,
    },
    completedDate: {
      type: Date,
      default: null,
    },
    estCost: {
      type: Number,
      required: [true, "estimated cost is required"],
      min: [0, "estimated cost cannot be negative"],
      default: 0,
    },
    costLines: {
      type: [
        {
          label: { type: String, trim: true, default: "" },
          amount: { type: Number, min: [0, "cost line cannot be negative"], default: 0 },
        },
      ],
      default: [],
    },
    dtcCodes: {
      type: [
        {
          code: { type: String, trim: true, default: "" },
          description: { type: String, trim: true, default: "" },
        },
      ],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    autoIndex: process.env.NODE_ENV !== "production",
  },
);

maintenanceEventSchema.index({ companyId: 1, status: 1, intakeDate: -1 });
maintenanceEventSchema.index({ vehicleId: 1, status: 1 });

/**
 * Derived dispatch status of a maintenance event. OVERDUE is never stored — it
 * is computed whenever a pending event has blown past its estimated return.
 */
export const dispatchStatusOf = (event) => {
  if (event.status === "COMPLETED") return "COMPLETED";
  if (event.estReturnDate && new Date(event.estReturnDate).getTime() < Date.now()) {
    return "OVERDUE";
  }
  return event.status;
};

const MaintenanceEvent = mongoose.model("MaintenanceEvent", maintenanceEventSchema);

export default MaintenanceEvent;