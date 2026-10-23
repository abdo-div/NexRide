import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorRole: { type: String, enum: ["customer", "company", "admin"], required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const supportTicketSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    category: {
      type: String,
      enum: ["BOOKING_CHANGE", "PAYMENT", "PICKUP_RETURN", "VEHICLE", "REFUND", "OTHER"],
      required: true,
    },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    status: {
      type: String,
      enum: ["OPEN", "WAITING_FOR_CUSTOMER", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
      index: true,
    },
    priority: { type: String, enum: ["NORMAL", "URGENT"], default: "NORMAL" },
    messages: { type: [messageSchema], default: [] },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true, autoIndex: process.env.NODE_ENV !== "production" },
);

supportTicketSchema.index({ bookingId: 1, customerId: 1, createdAt: -1 });
supportTicketSchema.index({ companyId: 1, status: 1, lastMessageAt: -1 });

export default mongoose.models.SupportTicket ||
  mongoose.model("SupportTicket", supportTicketSchema);
