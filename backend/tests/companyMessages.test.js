import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Conversation from "../models/conversation_model.js";
import Message from "../models/message_model.js";
import Booking from "../models/booking_model.js";
import Review from "../models/review_model.js";
import Company from "../models/Company_model.js";
import User from "../models/User_model.js";
import {
  getCompanyConversations,
  patchCompanyConversationsReadAll,
  postCompanyBroadcast,
} from "../controllers/companyMessagesController.js";
import {
  buildCompanyConversations,
  sendAgentMessage,
  getConversationThread,
  broadcastNotice,
  ensureBookingConversation,
} from "../services/companyMessagesService.js";

const companyA = "bbbbbbbbbbbbbbbbbbbbbbbb";
const companyB = "dddddddddddddddddddddddd";
const customerA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const conversationA = "cccccccccccccccccccccccc";
const conversationB = "ffffffffffffffffffffffff";
const bookingA = "dddddddddddddddddddddddd";
const adminId = "999999999999999999999999";

const activeBookingIds = ["111111111111111111111111"];
const postRentalIds = ["222222222222222222222222"];

const companyUser = (overrides = {}) => ({
  _id: customerA,
  id: customerA,
  role: "company",
  company: companyA,
  ...overrides,
});

const thenable = (value) => ({ then: (resolve) => resolve(value) });

const chain = (docs = [], distinctValue = []) => ({
  _docs: docs,
  sort() {
    return this;
  },
  skip() {
    return this;
  },
  limit() {
    return this;
  },
  select() {
    return this;
  },
  populate() {
    return this;
  },
  lean() {
    return this;
  },
  distinct() {
    return thenable(distinctValue);
  },
  then(resolve) {
    resolve(this._docs);
  },
});

const conversationDoc = (overrides = {}) => ({
  _id: conversationA,
  subject: "Booking NX-CCCCCC · BMW 520i",
  channel: "ACTIVE_BOOKING",
  status: "OPEN",
  unreadForCompany: 2,
  lastMessageAt: new Date("2026-10-05T10:00:00.000Z"),
  lastMessagePreview: "Booking created for the BMW 520i.",
  lastSender: "system",
  createdAt: new Date("2026-10-05T09:00:00.000Z"),
  customerId: {
    _id: customerA,
    name: "Ahmed Ali",
    photo: null,
    phoneNumber: "+218910000000",
  },
  bookingId: {
    _id: bookingA,
    pickupLocation: "Mitiga Airport VIP Valet",
    pickupMethod: "BRANCH_PICKUP",
    startDate: new Date("2026-10-06T00:00:00.000Z"),
    endDate: new Date("2026-10-09T00:00:00.000Z"),
    totalAmount: 750,
    bookingStatus: "CONFIRMED",
    vehicleId: { make: "BMW", model: "520i", year: 2024, photos: ["bmw.jpg"] },
  },
  ...overrides,
});

/** Stubs every model the inbox deck touches and records the query shapes. */
const stubInbox = (
  t,
  {
    conversations = [conversationDoc()],
    facet = {
      total: [{ count: 5 }],
      open: [{ count: 3 }],
      unreadConvos: [{ count: 2 }],
      unreadMessages: [{ total: 4 }],
      replyLatency: [{ avgMs: 1200000 }],
    },
    satisfaction = [{ _id: null, total: 10, avg: 4.6, positive: 8 }],
  } = {},
) => {
  const sinks = { deckMatches: [], listMatches: [], listCounts: [] };

  t.mock.method(Company, "findById", () => ({
    select() {
      return thenable({ _id: companyA, name: "Fleet A", slug: "fleet-a" });
    },
  }));

  t.mock.method(Conversation, "aggregate", (pipeline) => {
    const match = pipeline.find((stage) => stage.$match)?.$match;
    sinks.deckMatches.push(match);
    return thenable([facet]);
  });

  t.mock.method(Booking, "find", (filter) =>
    chain(
      [],
      filter.bookingStatus === "COMPLETED" ? postRentalIds : activeBookingIds,
    ),
  );

  t.mock.method(Review, "aggregate", () => thenable(satisfaction));

  t.mock.method(Conversation, "countDocuments", (filter) => {
    const inArr = filter.bookingId?.$in;
    if (inArr && inArr[0] === postRentalIds[0]) return thenable(1);
    if (inArr && inArr[0] === activeBookingIds[0]) return thenable(2);
    sinks.listCounts.push(filter);
    return thenable(conversations.length);
  });

  t.mock.method(Conversation, "find", (filter) => {
    sinks.listMatches.push(filter);
    return chain(conversations);
  });

  t.mock.method(User, "find", () => chain([], [customerA]));

  return sinks;
};

const invoke = (handler, req) =>
  new Promise((resolve) => {
    let statusCode = 200;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        resolve({ statusCode, body });
        return this;
      },
    };
    handler(req, res, (error) => {
      if (error) resolve({ error, statusCode });
    });
  });

// ---------------------------------------------------------------------------
// Tenant scoping: a company session must stay pinned to its own tenant
// ---------------------------------------------------------------------------

test("inbox for a company session stays pinned to the session tenant", async (t) => {
  const sinks = stubInbox(t);

  const outcome = await invoke(getCompanyConversations, {
    user: companyUser(),
    tenantId: companyA,
    query: { companyId: companyB }, // forged — must be ignored
  });

  assert.equal(outcome.statusCode, 200);
  assert.equal(sinks.deckMatches[0].companyId.toString(), companyA);
  assert.equal(sinks.listMatches[0].companyId.toString(), companyA);
});

test("an admin may load another company's inbox via ?companyId", async (t) => {
  const sinks = stubInbox(t);

  const outcome = await invoke(getCompanyConversations, {
    user: { _id: adminId, id: adminId, role: "admin" },
    tenantId: undefined,
    query: { companyId: companyB, page: 2 },
  });

  assert.equal(outcome.statusCode, 200);
  assert.equal(sinks.deckMatches[0].companyId.toString(), companyB);
  assert.equal(outcome.body.data.pagination.page, 2);
});

test("a company session without a linked tenant is rejected with 403", async () => {
  const outcome = await invoke(getCompanyConversations, {
    user: { _id: customerA, id: customerA, role: "company" },
    tenantId: undefined,
    query: {},
  });

  assert.equal(outcome.error.statusCode, 403);
});

test("invalid company identifiers are refused before any query", async () => {
  await assert.rejects(
    () => buildCompanyConversations({ companyId: "not-valid" }),
    (err) => err.statusCode === 400,
  );
});

// ---------------------------------------------------------------------------
// KPI honesty: every number is recomputed from real documents
// ---------------------------------------------------------------------------

test("the KPI ribbon is derived from conversations and reviews", async (t) => {
  stubInbox(t);

  const deck = await buildCompanyConversations({ companyId: companyA });

  assert.equal(deck.company.name, "Fleet A");
  assert.equal(deck.summary.total, 5);
  assert.equal(deck.summary.active, 3);
  assert.equal(deck.summary.unreadConversations, 2);
  assert.equal(deck.summary.unreadMessages, 4);
  assert.equal(deck.summary.avgFirstReplyMinutes, 20);
  assert.equal(deck.summary.satisfactionPct, 80);
  assert.equal(deck.summary.satisfactionAvg, 4.6);
});

test("quick-filter counts reflect the real tenant dataset", async (t) => {
  stubInbox(t);

  const deck = await buildCompanyConversations({ companyId: companyA });

  assert.deepEqual(deck.filters, {
    total: 5,
    needsReply: 2,
    activeRentals: 2,
    postRental: 1,
  });
});

test("view and channel filters scope the directory query", async (t) => {
  const sinks = stubInbox(t);

  await buildCompanyConversations({
    companyId: companyA,
    view: "needsReply",
    channel: "POST_RENTAL_SUPPORT",
  });

  const listMatch = sinks.listMatches[0];
  assert.deepEqual(listMatch.unreadForCompany, { $gt: 0 });
  assert.equal(listMatch.channel, "POST_RENTAL_SUPPORT");
});

test("activeRentals and postRental views scope by the real booking ids", async (t) => {
  const sinks = stubInbox(t);

  await buildCompanyConversations({ companyId: companyA, view: "activeRentals" });
  assert.deepEqual(
    sinks.listMatches[0].bookingId.$in.map(String),
    activeBookingIds,
  );

  await buildCompanyConversations({ companyId: companyA, view: "postRental" });
  assert.deepEqual(
    sinks.listMatches[1].bookingId.$in.map(String),
    postRentalIds,
  );
});

test("a search term matches subject, preview or the real customer", async (t) => {
  const sinks = stubInbox(t);

  await buildCompanyConversations({ companyId: companyA, q: "Ahmed" });

  const listMatch = sinks.listMatches[0];
  assert.ok(Array.isArray(listMatch.$or), "search builds an $or over real fields");
  assert.ok(
    listMatch.$or.some(
      (clause) => clause.customerId && String(clause.customerId.$in[0]) === customerA,
    ),
  );
});

test("the directory maps a real conversation into the row shape", async (t) => {
  stubInbox(t);

  const deck = await buildCompanyConversations({ companyId: companyA });
  const row = deck.conversations[0];

  assert.equal(row.id, conversationA);
  assert.equal(row.customer.name, "Ahmed Ali");
  assert.equal(row.customer.initials, "AA");
  assert.equal(row.booking.reference, `NX-${bookingA.slice(-6).toUpperCase()}`);
  assert.equal(row.booking.vehicle.make, "BMW");
  assert.equal(row.channel, "ACTIVE_BOOKING");
  assert.equal(row.unreadForCompany, 2);
});

test("a completed booking re-derives the channel as post-rental support", async (t) => {
  stubInbox(t, {
    conversations: [
      conversationDoc({
        bookingId: { ...conversationDoc().bookingId, bookingStatus: "COMPLETED" },
      }),
    ],
  });

  const deck = await buildCompanyConversations({ companyId: companyA });
  assert.equal(deck.conversations[0].channel, "POST_RENTAL_SUPPORT");
});

// ---------------------------------------------------------------------------
// Thread read receipt + agent replies
// ---------------------------------------------------------------------------

test("opening a thread clears the company unread receipt", async (t) => {
  const updates = [];
  t.mock.method(Conversation, "findOne", () => ({
    populate() {
      return this;
    },
    then(resolve) {
      resolve(conversationDoc());
    },
  }));
  t.mock.method(Message, "find", () =>
    chain([
      {
        _id: "aaaaaaaabbbbbbbbcccccccc",
        senderRole: "SYSTEM",
        senderName: "NexRide",
        body: "Booking created.",
        kind: "SYSTEM",
        createdAt: new Date("2026-10-05T10:00:00.000Z"),
      },
    ]),
  );
  t.mock.method(Message, "updateMany", (filter, update) => {
    updates.push(["message", filter, update]);
    return thenable({ modifiedCount: 1 });
  });
  t.mock.method(Conversation, "updateOne", (filter, update) => {
    updates.push(["conversation", filter, update]);
    return thenable({ modifiedCount: 1 });
  });

  const thread = await getConversationThread({
    companyId: companyA,
    conversationId: conversationA,
  });

  assert.equal(thread.conversation.unreadForCompany, 0);
  assert.equal(thread.messages.length, 1);
  const conversationUpdate = updates.find(([kind]) => kind === "conversation");
  assert.deepEqual(conversationUpdate[2].$set, { unreadForCompany: 0 });
});

test("an agent reply increments the customer's unread and stamps firstReplyAt", async (t) => {
  const created = [];
  t.mock.method(Conversation, "findOne", () => ({
    select() {
      return thenable({ _id: conversationA, firstReplyAt: null });
    },
  }));
  t.mock.method(Message, "create", (payload) => {
    created.push(payload);
    return Promise.resolve({ _id: "000000000000000000000001", ...payload });
  });
  let conversationUpdate = null;
  t.mock.method(Conversation, "updateOne", (filter, update) => {
    conversationUpdate = update;
    return thenable({});
  });

  const message = await sendAgentMessage({
    companyId: companyA,
    conversationId: conversationA,
    body: "Your car is ready.",
    agentName: "Fleet A",
  });

  assert.equal(message.senderRole, "AGENT");
  assert.equal(created[0].readByCustomer, false);
  assert.equal(conversationUpdate.$inc.unreadForCustomer, 1);
  assert.ok(conversationUpdate.$set.firstReplyAt instanceof Date);
  assert.equal(conversationUpdate.$set.lastSender, "agent");
});

test("a later agent reply keeps the original firstReplyAt", async (t) => {
  const repliedAt = new Date("2026-10-05T11:00:00.000Z");
  t.mock.method(Conversation, "findOne", () => ({
    select() {
      return thenable({ _id: conversationA, firstReplyAt: repliedAt });
    },
  }));
  t.mock.method(Message, "create", (payload) =>
    Promise.resolve({ _id: "000000000000000000000002", ...payload }),
  );
  let conversationUpdate = null;
  t.mock.method(Conversation, "updateOne", (filter, update) => {
    conversationUpdate = update;
    return thenable({});
  });

  await sendAgentMessage({
    companyId: companyA,
    conversationId: conversationA,
    body: "Following up.",
  });

  assert.equal(conversationUpdate.$set.firstReplyAt, undefined);
});

test("a company cannot answer another operator's conversation", async (t) => {
  t.mock.method(Conversation, "findOne", () => ({
    select() {
      return thenable(null);
    },
  }));

  await assert.rejects(
    () =>
      sendAgentMessage({
        companyId: companyA,
        conversationId: conversationB,
        body: "Hello?",
      }),
    (err) => err.statusCode === 404,
  );
});

// ---------------------------------------------------------------------------
// Read-all + broadcast write real rows
// ---------------------------------------------------------------------------

test("mark-all-read clears both the counters and the message receipts", async (t) => {
  t.mock.method(Conversation, "find", () => chain([], [conversationA]));
  let conversationFilter = null;
  let messageFilter = null;
  t.mock.method(Conversation, "updateMany", (filter) => {
    conversationFilter = filter;
    return thenable({ modifiedCount: 1 });
  });
  t.mock.method(Message, "updateMany", (filter) => {
    messageFilter = filter;
    return thenable({ modifiedCount: 3 });
  });

  const outcome = await invoke(patchCompanyConversationsReadAll, {
    user: companyUser(),
    tenantId: companyA,
    query: {},
  });

  assert.equal(outcome.statusCode, 200);
  assert.equal(outcome.body.data.updated, 1);
  assert.deepEqual(conversationFilter.unreadForCompany, { $gt: 0 });
  assert.equal(String(messageFilter.readByCompany), "false");
});

test("broadcast writes a real agent message into every open conversation", async (t) => {
  t.mock.method(Conversation, "find", () => ({
    select() {
      return thenable([{ _id: conversationA }, { _id: conversationB }]);
    },
  }));
  const inserted = [];
  t.mock.method(Message, "insertMany", (rows) => {
    inserted.push(...rows);
    return Promise.resolve(rows);
  });
  const updates = [];
  t.mock.method(Conversation, "updateOne", (filter, update) => {
    updates.push(update);
    return thenable({});
  });

  const outcome = await invoke(postCompanyBroadcast, {
    user: companyUser(),
    tenantId: companyA,
    query: {},
    body: { body: "Holiday hours this week." },
  });

  assert.equal(outcome.statusCode, 201);
  assert.equal(outcome.body.data.sent, 2);
  assert.equal(inserted.length, 2);
  assert.equal(inserted[0].senderRole, "AGENT");
  assert.equal(inserted[0].readByCustomer, false);
  assert.equal(updates.length, 2);
  assert.equal(updates[0].$inc.unreadForCustomer, 1);
});

test("broadcasting into an empty inbox writes nothing", async (t) => {
  t.mock.method(Conversation, "find", () => ({
    select() {
      return thenable([]);
    },
  }));
  t.mock.method(Message, "insertMany", () => {
    throw new Error("insertMany must not run for an empty inbox");
  });

  const result = await broadcastNotice({ companyId: companyA, body: "Hi" });
  assert.deepEqual(result, { sent: 0, conversations: 0 });
});

// ---------------------------------------------------------------------------
// Booking lifecycle: conversation is opened from real booking facts
// ---------------------------------------------------------------------------

test("ensureBookingConversation opens a thread and records the real booking event", async (t) => {
  t.mock.method(Conversation, "findOne", () => thenable(null));
  const createdConversations = [];
  t.mock.method(Conversation, "create", (payload) => {
    createdConversations.push(payload);
    return Promise.resolve({ _id: conversationA, ...payload });
  });
  const createdMessages = [];
  t.mock.method(Message, "create", (payload) => {
    createdMessages.push(payload);
    return Promise.resolve(payload);
  });

  const booking = {
    _id: bookingA,
    companyId: companyA,
    customerId: customerA,
    vehicleId: "eeeeeeeeeeeeeeeeeeeeeeee",
    startDate: new Date("2026-10-06T00:00:00.000Z"),
    endDate: new Date("2026-10-09T00:00:00.000Z"),
    pickupLocation: "Mitiga Airport",
    totalAmount: 750,
  };

  await ensureBookingConversation(booking, {
    vehicle: { make: "BMW", model: "520i", year: 2024 },
  });

  assert.equal(createdConversations.length, 1);
  assert.equal(createdConversations[0].channel, "ACTIVE_BOOKING");
  assert.equal(createdConversations[0].bookingId, bookingA);
  assert.equal(createdMessages.length, 1);
  assert.equal(createdMessages[0].kind, "SYSTEM");
  assert.match(createdMessages[0].body, /NX-[0-9A-F]{6}/);
  assert.match(createdMessages[0].body, /750\.00 LYD/);
});

test("ensureBookingConversation is idempotent for an existing thread", async (t) => {
  t.mock.method(Conversation, "findOne", () => thenable({ _id: conversationA }));
  t.mock.method(Conversation, "create", () => {
    throw new Error("create must not run when a thread already exists");
  });
  t.mock.method(Message, "create", () => {
    throw new Error("no system message must be duplicated");
  });

  const result = await ensureBookingConversation({
    _id: bookingA,
    companyId: companyA,
    customerId: customerA,
  });

  assert.equal(result._id, conversationA);
});

// ---------------------------------------------------------------------------
// Schema guards
// ---------------------------------------------------------------------------

test("the conversation booking index is partial so booking-less threads coexist", () => {
  const entry = Conversation.schema
    .indexes()
    .find(([keys]) => keys.bookingId === 1);
  assert.ok(entry, "bookingId index must exist");
  assert.equal(entry[1].unique, true);
  assert.ok(
    entry[1].partialFilterExpression,
    "index must be partial to avoid null collisions",
  );
});

test("the Message model exposes the per-side read receipts", () => {
  const schema = Message.schema;
  assert.ok(schema.path("readByCompany"));
  assert.ok(schema.path("readByCustomer"));
  assert.equal(schema.path("readByCompany").defaultValue, false);
  assert.equal(schema.path("readByCustomer").defaultValue, false);
  assert.ok(mongoose.isValidObjectId("000000000000000000000000"));
});
