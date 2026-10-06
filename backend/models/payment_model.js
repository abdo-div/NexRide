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
        values: ["CASH_ON_DELIVERY", "LOCAL_CARD", "MOAMALAT", "WALLET"],
        message: "Invalid payment method",
      },
    },
    // No `default: null` on purpose. A sparse unique index skips documents where
    // the field is absent, but a `null` value is still indexed. Defaulting to
    // null therefore made every cash payment collide platform-wide on the
    // second record (E11000). Leaving the field undefined keeps it out of the
    // partial unique index entirely.
    transactionId: {
      type: String,
      trim: true,
    },
    paymentGateway: {
      type: String,
      default: "LOCAL", // e.g., "MOAMALAT" or "LOCAL"
    },
    /**
     * Merchant reference handed to the payment gateway for the current attempt.
     * Kept on the ledger record so the verify step can map a gateway callback
     * back to the exact booking/customer without trusting client input.
     */
    // Same reasoning as transactionId: undefined, never null, so unpaid cash
    // ledger rows stay out of the partial unique index.
    merchantReference: {
      type: String,
      trim: true,
      maxlength: 40,
    },

    // -------------------------------------------------------------------------
    // Payment Lifecycle
    // -------------------------------------------------------------------------
    status: {
      type: String,
      enum: {
        values: [
          "PENDING",
          "COMPLETED",
          "FAILED",
          "REFUNDED",
          "PARTIALLY_REFUNDED",
        ],
        message: "Invalid payment status",
      },
      default: "PENDING",
      index: true,
    },
    paidAt: Date,

    // -------------------------------------------------------------------------
    // Refund Audit
    // -------------------------------------------------------------------------
    // Cancellation refunds mark the ledger row REFUNDED / PARTIALLY_REFUNDED
    // instead of deleting it, so revenue that will never pay out stays visible
    // and attributable. `refundAmount` is what the customer actually gets back;
    // the payout pipelines subtract it from what a company can be paid.
    refundAmount: {
      type: Number,
      min: [0, "Refund amount cannot be negative"],
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    refundReason: {
      type: String,
      trim: true,
      default: null,
    },

    // -------------------------------------------------------------------------
    // Cash Collection Audit
    // -------------------------------------------------------------------------
    // Cash has no gateway callback, so the settlement is attested by a human
    // rather than by the processor. These two fields record who took the money
    // and when, so a COMPLETED cash row is attributable in the ledger instead of
    // being indistinguishable from a card capture. Undefined (not null) when the
    // money has not been collected yet.
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    collectedAt: Date,

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

// Unique only over real gateway strings. `partialFilterExpression` is used
// instead of `sparse` because sparse still indexes an explicit null, whereas
// this matches nothing when the field is missing or null. Cash-on-delivery
// rows omit both fields, so they are excluded and never collide.
paymentSchema.index(
  { transactionId: 1 },
  {
    unique: true,
    partialFilterExpression: { transactionId: { $type: "string" } },
  },
);
paymentSchema.index(
  { merchantReference: 1 },
  {
    unique: true,
    partialFilterExpression: { merchantReference: { $type: "string" } },
  },
);

const Payment =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default Payment;
