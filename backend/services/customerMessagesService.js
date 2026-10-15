import mongoose from "mongoose";
import Conversation from "../models/conversation_model.js";
import Message from "../models/message_model.js";
import AppError from "../utils/appError.js";

const mapMessage = (message) => ({
  id: message._id.toString(),
  senderRole: message.senderRole,
  senderName: message.senderName ?? "",
  body: message.body,
  kind: message.kind,
  createdAt: message.createdAt?.toISOString() ?? null,
});

const populateCustomerConversation = (query) =>
  query
    .populate("companyId", "name logo phone city")
    .populate({
      path: "bookingId",
      select: "bookingStatus pickupLocation startDate endDate vehicleId",
      populate: { path: "vehicleId", select: "make model year photos" },
    });

const mapConversation = (conversation) => {
  const company = conversation.companyId;
  const booking = conversation.bookingId;
  const vehicle = booking?.vehicleId;
  return {
    id: conversation._id.toString(),
    subject: conversation.subject,
    status: conversation.status,
    unreadForCustomer: conversation.unreadForCustomer ?? 0,
    lastMessage: {
      preview: conversation.lastMessagePreview ?? "",
      at: conversation.lastMessageAt?.toISOString() ?? null,
      sender: conversation.lastSender ?? "system",
    },
    company: {
      id: company?._id?.toString() ?? null,
      name: company?.name ?? "Rental company",
      logo: company?.logo ?? null,
      phone: company?.phone ?? null,
      city: company?.city ?? null,
    },
    booking: booking
      ? {
          id: booking._id.toString(),
          status: booking.bookingStatus,
          pickupLocation: booking.pickupLocation,
          startDate: booking.startDate?.toISOString() ?? null,
          endDate: booking.endDate?.toISOString() ?? null,
          vehicle: vehicle
            ? {
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                photo: vehicle.photos?.[0] ?? null,
              }
            : null,
        }
      : null,
  };
};

const loadOwnedConversation = async (customerId, conversationId) => {
  if (!mongoose.isValidObjectId(conversationId)) {
    throw new AppError("Invalid conversation identifier.", 400);
  }
  const conversation = await populateCustomerConversation(
    Conversation.findOne({ _id: conversationId, customerId }),
  );
  if (!conversation) throw new AppError("Conversation not found.", 404);
  return conversation;
};

export const listCustomerConversations = async (customerId) => {
  const conversations = await populateCustomerConversation(
    Conversation.find({ customerId }).sort("-lastMessageAt -updatedAt").limit(100),
  );
  return {
    unread: conversations.reduce(
      (total, conversation) => total + (conversation.unreadForCustomer ?? 0),
      0,
    ),
    conversations: conversations.map(mapConversation),
  };
};

export const getCustomerConversationThread = async ({ customerId, conversationId }) => {
  const conversation = await loadOwnedConversation(customerId, conversationId);
  const messages = await Message.find({ conversationId: conversation._id }).sort("createdAt");

  if ((conversation.unreadForCustomer ?? 0) > 0) {
    await Promise.all([
      Message.updateMany(
        { conversationId: conversation._id, readByCustomer: false },
        { $set: { readByCustomer: true } },
      ),
      Conversation.updateOne(
        { _id: conversation._id },
        { $set: { unreadForCustomer: 0 } },
      ),
    ]);
    conversation.unreadForCustomer = 0;
  }

  return {
    conversation: mapConversation(conversation),
    messages: messages.map(mapMessage),
  };
};

export const sendCustomerMessage = async ({ customerId, conversationId, body, customerName }) => {
  const conversation = await loadOwnedConversation(customerId, conversationId);
  const now = new Date();
  const message = await Message.create({
    conversationId: conversation._id,
    senderRole: "CUSTOMER",
    senderName: customerName || "Customer",
    body,
    kind: "TEXT",
    readByCustomer: true,
    readByCompany: false,
  });
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessageAt: now,
        lastMessagePreview: body.slice(0, 220),
        lastSender: "customer",
        status: "OPEN",
      },
      $inc: { unreadForCompany: 1 },
    },
  );
  return mapMessage(message);
};
