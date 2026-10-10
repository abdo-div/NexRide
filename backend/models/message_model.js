import mongoose from "mongoose";

/**
 * A single event in a conversation thread. Rows are SYSTEM (real platform
 * events such as booking creation), CUSTOMER (their side of the thread) or
 * AGENT (the operator's replies written through the composer). Read receipts
 * are per-side booleans so the company inbox and the future customer inbox can
 * each derive "unread" from their own half.
 */
const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: [true, "A message must belong to a conversation"],
      index: true,
    },
    senderRole: {
      type: String,
      enum: {
        values: ["CUSTOMER", "AGENT", "SYSTEM"],
        message: "Invalid message sender role",
      },
      required: [true, "A message needs a sender role"],
      index: true,
    },
    senderName: {
      type: String,
      trim: true,
      default: "",
      maxlength: [120, "Sender name cannot exceed 120 characters"],
    },
    body: {
      type: String,
      required: [true, "Message body is required"],
      trim: true,
      maxlength: [4000, "Message body cannot exceed 4000 characters"],
    },
    kind: {
      type: String,
      enum: {
        values: ["TEXT", "SYSTEM"],
        message: "Invalid message kind",
      },
      default: "TEXT",
      index: true,
    },
    readByCustomer: {
      type: Boolean,
      default: false,
    },
    readByCompany: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    autoIndex: process.env.NODE_ENV !== "production",
  },
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.models.Message ||
  mongoose.model("Message", messageSchema);

export default Message;