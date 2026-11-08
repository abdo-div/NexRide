import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    feeAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "LYD", uppercase: true, trim: true },
    refundFraction: { type: Number, required: true, min: 0, max: 1 },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    reason: { type: String, trim: true, default: null },
    requestedAt: { type: Date, default: Date.now },
    processingAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failureReason: { type: String, trim: true, default: null },
    provider: { type: String, trim: true, uppercase: true, default: null },
    gatewayOrderId: { type: String, trim: true, maxlength: 40, default: null },
    gatewayRefundTransactionId: {
      type: String,
      trim: true,
      maxlength: 40,
      default: null,
    },
    gatewayTargetTransactionId: {
      type: String,
      trim: true,
      maxlength: 40,
      default: null,
    },
    gatewayCode: { type: String, trim: true, maxlength: 100, default: null },
  },
  {
    timestamps: true,
    autoIndex: process.env.NODE_ENV !== "production",
  },
);

refundSchema.index({ bookingId: 1, createdAt: -1 });
refundSchema.index(
  { gatewayRefundTransactionId: 1 },
  {
    unique: true,
    partialFilterExpression: { gatewayRefundTransactionId: { $type: "string" } },
  },
);

export default mongoose.models.Refund || mongoose.model("Refund", refundSchema);
