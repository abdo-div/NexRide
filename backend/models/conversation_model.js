import mongoose from "mongoose";

/**
 * A customer-company conversation. Conversations are never seeded static rows:
 * an ACTIVE_BOOKING conversation is opened by the platform when a real booking
 * is created (fire-and-forget from the booking controller) and its channel is
 * re-derived at read time from the live booking status (COMPLETED => post-rental
 * support). The thread of SYSTEM events carries only real booking facts
 * (reference, vehicle, pickup, amounts); agent replies are written through the
 * composer and therefore never invented server-side either.
 */
const conversationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "A conversation must belong to a rental company"],
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A conversation must belong to a customer"],
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    subject: {
      type: String,
      required: [true, "A conversation needs a subject"],
      trim: true,
      maxlength: [200, "Conversation subject cannot exceed 200 characters"],
    },
    channel: {
      type: String,
      enum: {
        values: ["INQUIRY", "ACTIVE_BOOKING", "POST_RENTAL_SUPPORT"],
        message: "Invalid conversation channel",
      },
      default: "INQUIRY",
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["OPEN", "RESOLVED", "ARCHIVED"],
        message: "Invalid conversation status",
      },
      default: "OPEN",
      index: true,
    },
    unreadForCompany: {
      type: Number,
      default: 0,
      min: 0,
    },
    unreadForCustomer: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    lastMessagePreview: {
      type: String,
      trim: true,
      default: "",
      maxlength: [220, "Last message preview cannot exceed 220 characters"],
    },
    lastSender: {
      type: String,
      enum: {
        values: ["customer", "agent", "system"],
        message: "Invalid last sender",
      },
      default: "system",
    },
    // First AGENT reply after the conversation opened — the raw material for
    // the "avg response speed" KPI (computed from real documents, never fixed).
    firstReplyAt: {
      type: Date,
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

// Inbox projection: company-first ordering for the conversation feed.
conversationSchema.index({ companyId: 1, lastMessageAt: -1 });
// Unique thread per booking: a booking opens exactly one conversation. A
// partial filter (rather than sparse) is required because `bookingId` defaults
// to null, and sparse indexes DO index an explicit null — which would let many
// booking-less threads collide on the unique key.
conversationSchema.index(
  { bookingId: 1 },
  { unique: true, partialFilterExpression: { bookingId: { $type: "objectId" } } },
);
conversationSchema.index({ companyId: 1, status: 1, unreadForCompany: 1 });
conversationSchema.index({ customerId: 1, companyId: 1 });

export const Conversation = mongoose.models.Conversation ||
  mongoose.model("Conversation", conversationSchema);

export default Conversation;