import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    // -------------------------------------------------------------------------
    // Core Links
    // -------------------------------------------------------------------------
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Payment must be linked to a booking"],
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Payment must belong to a customer"],
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Payment must be linked to a company"],
      index: true,
    },

    // -------------------------------------------------------------------------
    // Amount & Breakdown
    // -------------------------------------------------------------------------
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      default: "LYD",
      uppercase: true,
      match: [/^[A-Z]{3}$/, "Currency must be a three-letter ISO code"],
    },
    commissionAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    commissionRate: {
      type: Number,
      required: true,
      default: 8,
      min: [0, "Commission cannot be negative"],
      max: [100, "Commission cannot exceed 100%"],
    },
    companyShare: {
      type: Number,
      required: true,
      default: 0,
    },

    // -------------------------------------------------------------------------
    // Gateway Details
    // -------------------------------------------------------------------------
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: {
        values: ["CASH_ON_DELIVERY", "LOCAL_CARD", "STRIPE", "WALLET"],
        message: "Invalid payment method",
      },
    },
    transactionId: {
      type: String,
      default: null,
      trim: true,
    },
    paymentGateway: {
      type: String,
      default: "LOCAL", // e.g., "STRIPE", "SADAD", "LOCAL"
    },

    // -------------------------------------------------------------------------
    // Payment Lifecycle
    // -------------------------------------------------------------------------
    status: {
      type: String,
      enum: {
        values: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"],
        message: "Invalid payment status",
      },
      default: "PENDING",
      index: true,
    },
    paidAt: Date,

    // -------------------------------------------------------------------------
    // Company Payout Settlement Lifecycle
    // -------------------------------------------------------------------------
    payoutStatus: {
      type: String,
      enum: {
        values: ["UNSETTLED", "PROCESSING", "SETTLED"],
        message: "Invalid payout status",
      },
      default: "UNSETTLED",
      index: true,
    },
    payoutSettledAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    autoIndex: process.env.NODE_ENV !== "production",
  },
);

// Auto-calculate payout split before saving
paymentSchema.pre("save", async function () {
  if (this.isModified("amount") || this.isModified("companyId") || this.isNew) {
    const company = await mongoose
      .model("Company")
      .findById(this.companyId)
      .select("customCommissionRate");
    this.commissionRate = company?.customCommissionRate ?? 8;
    this.commissionAmount = Number(
      ((this.amount * this.commissionRate) / 100).toFixed(2),
    );
    this.companyShare = Number(
      (this.amount - this.commissionAmount).toFixed(2),
    );
  }
  if (this.isModified("status")) {
    this.paidAt =
      this.status === "COMPLETED" ? this.paidAt || new Date() : null;
  }
});

paymentSchema.index({ bookingId: 1, status: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

const Payment =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default Payment;
