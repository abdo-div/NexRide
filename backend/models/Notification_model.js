import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "BOOKING_CREATED",
        "PAYMENT_COMPLETED",
        "SUPPORT_REPLY",
        "PAYMENT_FAILED",
        "BOOKING_CONFIRMED",
        "BOOKING_CHANGED",
        "BOOKING_CANCELLED",
        "PICKUP_REMINDER",
        "RETURN_REMINDER",
        "SAVED_SEARCH_MATCH",
      ],
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 600 },
    actionUrl: { type: String, trim: true, default: null },
    readAt: { type: Date, default: null },
    dedupeKey: { type: String, trim: true },
    emailStatus: {
      type: String,
      enum: ["NOT_REQUESTED", "PENDING", "SENT", "FAILED"],
      default: "NOT_REQUESTED",
    },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupeKey: { $type: "string" } },
  },
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
