import Booking from "../models/booking_model.js";
import SupportTicket from "../models/SupportTicket_model.js";
import AppError from "../utils/appError.js";
import { createCustomerNotification } from "./notificationService.js";

const reference = () =>
  `NX-SUP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const assertAccess = (ticket, user, tenantId = null) => {
  const customerId = ticket.customerId?._id ?? ticket.customerId;
  const companyId = ticket.companyId?._id ?? ticket.companyId;
  if (user.role === "admin") return;
  if (user.role === "customer" && String(customerId) === String(user.id)) return;
  if (user.role === "company" && String(companyId) === String(tenantId ?? user.company)) return;
  throw new AppError("Support ticket not found", 404);
};

export const createBookingTicket = async (customerId, payload) => {
  const booking = await Booking.findOne({ _id: payload.bookingId, customerId });
  if (!booking) throw new AppError("Booking not found", 404);

  return SupportTicket.create({
    reference: reference(),
    bookingId: booking._id,
    customerId,
    companyId: booking.companyId?._id ?? booking.companyId,
    category: payload.category,
    subject: payload.subject,
    priority: payload.priority ?? "NORMAL",
    messages: [{ authorId: customerId, authorRole: "customer", body: payload.message }],
    lastMessageAt: new Date(),
  });
};

export const getBookingTickets = (customerId, bookingId) =>
  SupportTicket.find({ customerId, bookingId }).sort({ lastMessageAt: -1 });

export const listStaffTickets = (user, tenantId, query = {}) => {
  const companyId = tenantId ?? user.company;
  if (user.role !== "admin" && !companyId) {
    throw new AppError("No company tenant is linked to this account", 403);
  }
  const filter = user.role === "admin" ? {} : { companyId };
  if (query.status) filter.status = query.status;
  return SupportTicket.find(filter).sort({ lastMessageAt: -1 }).limit(100);
};

export const addTicketMessage = async (ticketId, user, tenantId, body) => {
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) throw new AppError("Support ticket not found", 404);
  assertAccess(ticket, user, tenantId);
  if (ticket.status === "CLOSED") throw new AppError("Closed support tickets cannot receive messages", 409);

  ticket.messages.push({ authorId: user.id, authorRole: user.role, body });
  ticket.lastMessageAt = new Date();
  if (user.role === "customer") {
    if (ticket.status === "WAITING_FOR_CUSTOMER") ticket.status = "OPEN";
  } else {
    ticket.status = "WAITING_FOR_CUSTOMER";
  }
  await ticket.save();

  if (user.role !== "customer") {
    void createCustomerNotification({
      userId: ticket.customerId,
      bookingId: ticket.bookingId,
      type: "SUPPORT_REPLY",
      title: "Support replied",
      message: `There is a new reply on support request ${ticket.reference}.`,
      dedupeKey: `SUPPORT_REPLY:${ticket._id}:${ticket.lastMessageAt.getTime()}`,
    }).catch(() => {});
  }
  return ticket;
};

export const updateTicketStatus = async (ticketId, user, tenantId, status) => {
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) throw new AppError("Support ticket not found", 404);
  assertAccess(ticket, user, tenantId);
  if (user.role === "customer" && status !== "CLOSED") {
    throw new AppError("Customers may only close a support request", 403);
  }
  ticket.status = status;
  ticket.resolvedAt = status === "RESOLVED" ? new Date() : ticket.resolvedAt;
  ticket.closedAt = status === "CLOSED" ? new Date() : ticket.closedAt;
  await ticket.save();
  return ticket;
};
