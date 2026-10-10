import mongoose from "mongoose";
import Conversation from "../models/conversation_model.js";
import Message from "../models/message_model.js";
import Booking from "../models/booking_model.js";
import Review from "../models/review_model.js";
import Company from "../models/Company_model.js";
import User from "../models/User_model.js";
import AppError from "../utils/appError.js";
import { resolvePagination, buildPaginationMeta } from "../utils/pagination.js";

/**
 * Fleet-operator Messages (Inbox) workspace.
 *
 * The inbox is a projection over real Conversation + Message documents, never a
 * seeded demo table. A conversation enters the inbox only because a real
 * lifecycle event created it (currently: booking creation, via
 * `ensureBookingConversation`) and every SYSTEM line it carries restates
 * persisted booking facts. The KPI ribbon (active conversations, unread
 * priority, average first-reply speed, customer satisfaction) is recomputed
 * from the tenant's own conversations, messages and reviews — the tenant scope
 * is fixed by the caller (protect() => req.tenantId) so a forged query string
 * cannot pivot the deck onto another operator.
 */

// Channel is derived from the live booking status at read time, so a booking
// that later completes migrates from "active booking" to "post-rental support"
// without any backfill.
const ACTIVE_BOOKING_STATUSES = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "ACTIVE"];

const channelForBookingStatus = (bookingStatus) =>
  bookingStatus === "COMPLETED" ? "POST_RENTAL_SUPPORT" : "ACTIVE_BOOKING";

const referenceOf = (id) =>
  id ? `NX-${String(id).slice(-6).toUpperCase()}` : "NX-PENDING";

const initialsOf = (name) => {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "--";
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
};

const round1 = (value) =>
  Number.isFinite(value) ? Math.round(value * 10) / 10 : null;

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const formatDate = (value) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
};

const previewOf = (body) => String(body ?? "").trim().slice(0, 220);

const asScope = (companyId) => {
  if (!mongoose.isValidObjectId(companyId)) {
    throw new AppError("Invalid company identifier.", 400);
  }
  return new mongoose.Types.ObjectId(companyId);
};

/**
 * Open the conversation for a freshly created booking and record the real
 * lifecycle event as a SYSTEM line. Idempotent: the unique bookingId index
 * guarantees one thread per booking even under concurrent retries.
 */
export const ensureBookingConversation = async (booking, { vehicle } = {}) => {
  if (!booking?._id) return null;

  const existing = await Conversation.findOne({ bookingId: booking._id });
  if (existing) return existing;

  const resolvedVehicle =
    vehicle ??
    (await mongoose
      .model("Vehicle")
      .findById(booking.vehicleId)
      .select("make model year")
      .lean());

  const vehicleLabel = resolvedVehicle
    ? `${resolvedVehicle.make ?? ""} ${resolvedVehicle.model ?? ""}`.trim() ||
      "vehicle"
    : "vehicle";

  const subject = `Booking ${referenceOf(booking._id)} · ${vehicleLabel}`;
  const body = [
    `Booking ${referenceOf(booking._id)} created for the ${vehicleLabel}.`,
    `Rental ${formatDate(booking.startDate)} → ${formatDate(booking.endDate)}.`,
    `Pickup: ${booking.pickupLocation ?? "—"}.`,
    `Total: ${Number(booking.totalAmount ?? 0).toFixed(2)} LYD.`,
  ].join(" ");

  let conversation;
  try {
    conversation = await Conversation.create({
      companyId: booking.companyId,
      customerId: booking.customerId,
      bookingId: booking._id,
      subject,
      channel: "ACTIVE_BOOKING",
      status: "OPEN",
      unreadForCompany: 0,
      unreadForCustomer: 0,
      lastMessageAt: new Date(),
      lastMessagePreview: previewOf(body),
      lastSender: "system",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return Conversation.findOne({ bookingId: booking._id });
    }
    throw error;
  }

  await Message.create({
    conversationId: conversation._id,
    senderRole: "SYSTEM",
    senderName: "NexRide",
    body,
    kind: "SYSTEM",
    readByCompany: true,
    readByCustomer: false,
  });

  return conversation;
};

const mapMessage = (message) => ({
  id: message._id.toString(),
  senderRole: message.senderRole,
  senderName: message.senderName ?? "",
  body: message.body,
  kind: message.kind,
  createdAt: message.createdAt?.toISOString() ?? null,
});

const mapConversation = (conversation) => {
  const customer = conversation.customerId;
  const booking = conversation.bookingId;
  const vehicle = booking?.vehicleId;
  const bookingStatus = booking?.bookingStatus ?? null;

  return {
    id: conversation._id.toString(),
    subject: conversation.subject,
    channel: bookingStatus
      ? channelForBookingStatus(bookingStatus)
      : conversation.channel,
    status: conversation.status,
    unreadForCompany: conversation.unreadForCompany ?? 0,
    lastMessage: {
      preview: conversation.lastMessagePreview ?? "",
      at: conversation.lastMessageAt
        ? conversation.lastMessageAt.toISOString()
        : null,
      sender: conversation.lastSender ?? "system",
    },
    createdAt: conversation.createdAt?.toISOString() ?? null,
    customer: {
      id: customer?._id?.toString() ?? null,
      name: customer?.name ?? "Customer",
      initials: initialsOf(customer?.name),
      photo: customer?.photo ?? null,
      phoneNumber: customer?.phoneNumber ?? null,
    },
    booking: booking
      ? {
          reference: referenceOf(booking._id),
          status: bookingStatus,
          pickupMethod: booking.pickupMethod ?? "BRANCH_PICKUP",
          pickupLocation: booking.pickupLocation ?? null,
          startDate: booking.startDate?.toISOString() ?? null,
          endDate: booking.endDate?.toISOString() ?? null,
          totalAmount: booking.totalAmount ?? null,
          vehicle: vehicle
            ? {
                make: vehicle.make ?? null,
                model: vehicle.model ?? null,
                year: vehicle.year ?? null,
                photo: vehicle.photos?.[0] ?? null,
              }
            : null,
        }
      : null,
  };
};

const populateConversation = (query) =>
  query
    .populate("customerId", "name photo phoneNumber")
    .populate({
      path: "bookingId",
      select:
        "pickupLocation pickupMethod startDate endDate totalAmount bookingStatus vehicleId",
    });

/**
 * Tenant-scoped inbox deck: KPI ribbon, quick-filter counts and one page of the
 * conversation feed.
 */
export const buildCompanyConversations = async ({
  companyId,
  page,
  limit,
  view,
  channel,
  q,
}) => {
  const scope = asScope(companyId);
  const company = await Company.findById(companyId).select("name slug");
  if (!company) {
    throw new AppError("No company found with that ID.", 404);
  }

  // ---------------------------------------------------------------------------
  // 1. KPI ribbon + quick-filter counts, all recomputed from real documents
  // ---------------------------------------------------------------------------
  const [convFacet] = await Conversation.aggregate([
    { $match: { companyId: scope } },
    {
      $facet: {
        total: [{ $count: "count" }],
        open: [{ $match: { status: "OPEN" } }, { $count: "count" }],
        unreadConvos: [
          { $match: { unreadForCompany: { $gt: 0 } } },
          { $count: "count" },
        ],
        unreadMessages: [
          { $group: { _id: null, total: { $sum: "$unreadForCompany" } } },
        ],
        replyLatency: [
          { $match: { firstReplyAt: { $ne: null } } },
          {
            $project: {
              ms: { $subtract: ["$firstReplyAt", "$createdAt"] },
            },
          },
          { $group: { _id: null, avgMs: { $avg: "$ms" } } },
        ],
      },
    },
  ]);

  const [activeBookingIds, postRentalIds, [satisfaction]] = await Promise.all([
    Booking.find({
      companyId: scope,
      bookingStatus: { $in: ACTIVE_BOOKING_STATUSES },
    }).distinct("_id"),
    Booking.find({ companyId: scope, bookingStatus: "COMPLETED" }).distinct(
      "_id",
    ),
    Review.aggregate([
      { $match: { companyId: scope } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avg: { $avg: "$rating" },
          positive: { $sum: { $cond: [{ $gte: ["$rating", 4] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const [activeRentals, postRental] = await Promise.all([
    activeBookingIds.length > 0
      ? Conversation.countDocuments({
          companyId: scope,
          bookingId: { $in: activeBookingIds },
        })
      : 0,
    postRentalIds.length > 0
      ? Conversation.countDocuments({
          companyId: scope,
          bookingId: { $in: postRentalIds },
        })
      : 0,
  ]);

  const totalConversations = convFacet?.total?.[0]?.count ?? 0;
  const unreadConversations = convFacet?.unreadConvos?.[0]?.count ?? 0;
  const avgMs = convFacet?.replyLatency?.[0]?.avgMs;
  const avgFirstReplyMinutes =
    Number.isFinite(avgMs) && avgMs >= 0
      ? Math.round((avgMs / 60000) * 10) / 10
      : null;

  const satisfactionTotal = satisfaction?.total ?? 0;
  const satisfactionPct =
    satisfactionTotal > 0
      ? Math.round(((satisfaction.positive ?? 0) / satisfactionTotal) * 1000) / 10
      : null;

  // ---------------------------------------------------------------------------
  // 2. One page of the conversation feed (searchable, filterable, bounded)
  // ---------------------------------------------------------------------------
  const { page: safePage, limit: safeLimit, skip } = resolvePagination(
    { page, limit },
    { defaultLimit: 10 },
  );

  const listMatch = { companyId: scope };
  if (["INQUIRY", "ACTIVE_BOOKING", "POST_RENTAL_SUPPORT"].includes(channel)) {
    listMatch.channel = channel;
  }
  if (view === "needsReply") {
    listMatch.unreadForCompany = { $gt: 0 };
  } else if (view === "activeRentals" && activeBookingIds.length > 0) {
    listMatch.bookingId = { $in: activeBookingIds };
  } else if (view === "activeRentals") {
    listMatch.bookingId = { $in: [] };
  } else if (view === "postRental" && postRentalIds.length > 0) {
    listMatch.bookingId = { $in: postRentalIds };
  } else if (view === "postRental") {
    listMatch.bookingId = { $in: [] };
  }

  const term = typeof q === "string" ? q.trim() : "";
  if (term) {
    const rx = new RegExp(escapeRegExp(term), "i");
    const matchedCustomers = await User.find({
      role: "customer",
      name: rx,
    }).distinct("_id");
    listMatch.$or = [
      { subject: rx },
      { lastMessagePreview: rx },
      { customerId: { $in: matchedCustomers } },
    ];
  }

  const listTotal = await Conversation.countDocuments(listMatch);
  const listDocs = await populateConversation(
    Conversation.find(listMatch)
      .sort("-lastMessageAt -updatedAt")
      .skip(skip)
      .limit(safeLimit),
  );

  return {
    company: { name: company.name, slug: company.slug },
    summary: {
      total: totalConversations,
      active: convFacet?.open?.[0]?.count ?? 0,
      unreadConversations,
      unreadMessages: convFacet?.unreadMessages?.[0]?.total ?? 0,
      avgFirstReplyMinutes,
      satisfactionPct,
      satisfactionAvg: round1(satisfaction?.avg),
    },
    filters: {
      total: totalConversations,
      needsReply: unreadConversations,
      activeRentals,
      postRental,
    },
    conversations: listDocs.map(mapConversation),
    pagination: buildPaginationMeta({
      page: safePage,
      limit: safeLimit,
      total: listTotal,
    }),
  };
};

const loadOwnedConversation = async (companyId, conversationId) => {
  const scope = asScope(companyId);
  if (!mongoose.isValidObjectId(conversationId)) {
    throw new AppError("Invalid conversation identifier.", 400);
  }
  const conversation = await populateConversation(
    Conversation.findOne({ _id: conversationId, companyId: scope }),
  );
  if (!conversation) {
    throw new AppError("Conversation not found.", 404);
  }
  return conversation;
};

/**
 * One conversation thread. Opening it marks the company side read — the inbox
 * unread badge is cleared from the real receipts, not optimistically.
 */
export const getConversationThread = async ({ companyId, conversationId }) => {
  const conversation = await loadOwnedConversation(companyId, conversationId);
  const messages = await Message.find({
    conversationId: conversation._id,
  }).sort("createdAt");

  if ((conversation.unreadForCompany ?? 0) > 0) {
    await Promise.all([
      Message.updateMany(
        { conversationId: conversation._id, readByCompany: false },
        { $set: { readByCompany: true } },
      ),
      Conversation.updateOne(
        { _id: conversation._id },
        { $set: { unreadForCompany: 0 } },
      ),
    ]);
    conversation.unreadForCompany = 0;
  }

  return {
    conversation: mapConversation(conversation),
    messages: messages.map(mapMessage),
  };
};

/**
 * Append an agent reply to a thread the tenant owns. The first reply stamps
 * `firstReplyAt`, which is exactly what the "avg response speed" KPI averages.
 */
export const sendAgentMessage = async ({
  companyId,
  conversationId,
  body,
  agentName,
}) => {
  const scope = asScope(companyId);
  if (!mongoose.isValidObjectId(conversationId)) {
    throw new AppError("Invalid conversation identifier.", 400);
  }
  const conversation = await Conversation.findOne({
    _id: conversationId,
    companyId: scope,
  }).select("_id firstReplyAt");
  if (!conversation) {
    throw new AppError("Conversation not found.", 404);
  }

  const now = new Date();
  const message = await Message.create({
    conversationId: conversation._id,
    senderRole: "AGENT",
    senderName: agentName || "Fleet Operator",
    body,
    kind: "TEXT",
    readByCompany: true,
    readByCustomer: false,
  });

  const update = {
    $set: {
      lastMessageAt: now,
      lastMessagePreview: previewOf(body),
      lastSender: "agent",
      status: "OPEN",
    },
    $inc: { unreadForCustomer: 1 },
  };
  if (!conversation.firstReplyAt) {
    update.$set.firstReplyAt = now;
  }
  await Conversation.updateOne({ _id: conversation._id }, update);

  return mapMessage(message);
};

/**
 * Clear the company unread counter on one thread (opening it already does this
 * via getConversationThread; this is the explicit idempotent variant).
 */
export const markConversationRead = async ({ companyId, conversationId }) => {
  const conversation = await loadOwnedConversation(companyId, conversationId);
  if ((conversation.unreadForCompany ?? 0) > 0) {
    await Promise.all([
      Message.updateMany(
        { conversationId: conversation._id, readByCompany: false },
        { $set: { readByCompany: true } },
      ),
      Conversation.updateOne(
        { _id: conversation._id },
        { $set: { unreadForCompany: 0 } },
      ),
    ]);
  }
  return { id: conversation._id.toString(), unreadForCompany: 0 };
};

/** Clear the company unread counter across the whole tenant inbox. */
export const markAllConversationsRead = async ({ companyId }) => {
  const scope = asScope(companyId);
  const ids = await Conversation.find({ companyId: scope }).distinct("_id");
  const [conversations] = await Promise.all([
    Conversation.updateMany(
      { companyId: scope, unreadForCompany: { $gt: 0 } },
      { $set: { unreadForCompany: 0 } },
    ),
    ids.length > 0
      ? Message.updateMany(
          { conversationId: { $in: ids }, readByCompany: false },
          { $set: { readByCompany: true } },
        )
      : Promise.resolve(),
  ]);
  return { updated: conversations.modifiedCount ?? 0 };
};

/**
 * Broadcast a real notice into every OPEN conversation of the tenant. Each
 * recipient gets an actual AGENT message row; nothing is faked client-side.
 */
export const broadcastNotice = async ({ companyId, body, agentName }) => {
  const scope = asScope(companyId);
  const conversations = await Conversation.find({
    companyId: scope,
    status: "OPEN",
  }).select("_id");

  if (conversations.length === 0) {
    return { sent: 0, conversations: 0 };
  }

  const now = new Date();
  await Message.insertMany(
    conversations.map((conversation) => ({
      conversationId: conversation._id,
      senderRole: "AGENT",
      senderName: agentName || "Fleet Operator",
      body,
      kind: "TEXT",
      readByCompany: true,
      readByCustomer: false,
    })),
  );

  await Promise.all(
    conversations.map((conversation) =>
      Conversation.updateOne(
        { _id: conversation._id },
        {
          $set: {
            lastMessageAt: now,
            lastMessagePreview: previewOf(body),
            lastSender: "agent",
          },
          $inc: { unreadForCustomer: 1 },
        },
      ),
    ),
  );

  return { sent: conversations.length, conversations: conversations.length };
};
