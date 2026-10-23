import assert from "node:assert/strict";
import { test } from "node:test";
import Booking from "../models/booking_model.js";
import SupportTicket from "../models/SupportTicket_model.js";
import AppError from "../utils/appError.js";
import {
  addTicketMessage,
  createBookingTicket,
  listStaffTickets,
  updateTicketStatus,
} from "../services/supportTicketService.js";
import {
  createSupportTicketSchema,
  supportMessageSchema,
} from "../validations/supportTicket.validation.js";

const customerId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const bookingId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const companyId = "cccccccccccccccccccccccc";
const ticketId = "dddddddddddddddddddddddd";

test("Task 5: creating support scopes the booking to the logged-in customer", async (t) => {
  let bookingFilter;
  let created;
  t.mock.method(Booking, "findOne", async (filter) => {
    bookingFilter = filter;
    return { _id: bookingId, companyId };
  });
  t.mock.method(SupportTicket, "create", async (payload) => {
    created = payload;
    return { _id: ticketId, ...payload };
  });

  const ticket = await createBookingTicket(customerId, {
    bookingId,
    category: "PAYMENT",
    subject: "Payment failed",
    message: "Please check this payment",
  });

  assert.deepEqual(bookingFilter, { _id: bookingId, customerId });
  assert.equal(created.companyId, companyId);
  assert.equal(created.messages[0].authorRole, "customer");
  assert.match(ticket.reference, /^NX-SUP-/);
});

test("Task 5: another customer's booking cannot be used to create a ticket", async (t) => {
  t.mock.method(Booking, "findOne", async () => null);
  await assert.rejects(
    createBookingTicket(customerId, {
      bookingId,
      category: "OTHER",
      subject: "Need help",
      message: "Cannot find the booking",
    }),
    (error) => error instanceof AppError && error.statusCode === 404,
  );
});

const ticketFixture = (overrides = {}) => ({
  _id: ticketId,
  bookingId,
  customerId,
  companyId,
  status: "OPEN",
  messages: [],
  async save() { return this; },
  ...overrides,
});

test("Task 5: customers can reply only to their own open support thread", async (t) => {
  const ticket = ticketFixture();
  t.mock.method(SupportTicket, "findById", async () => ticket);

  const result = await addTicketMessage(
    ticketId,
    { id: customerId, role: "customer" },
    null,
    "Here is more information",
  );

  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].authorRole, "customer");

  await assert.rejects(
    addTicketMessage(
      ticketId,
      { id: "eeeeeeeeeeeeeeeeeeeeeeee", role: "company", company: "ffffffffffffffffffffffff" },
      "ffffffffffffffffffffffff",
      "Cross tenant reply",
    ),
    (error) => error instanceof AppError && error.statusCode === 404,
  );
});

test("Task 5: customers may close but cannot mark requests resolved", async (t) => {
  const ticket = ticketFixture();
  t.mock.method(SupportTicket, "findById", async () => ticket);
  await assert.rejects(
    updateTicketStatus(ticketId, { id: customerId, role: "customer" }, null, "RESOLVED"),
    (error) => error instanceof AppError && error.statusCode === 403,
  );
  const closed = await updateTicketStatus(
    ticketId,
    { id: customerId, role: "customer" },
    null,
    "CLOSED",
  );
  assert.equal(closed.status, "CLOSED");
  assert.ok(closed.closedAt instanceof Date);
});

test("Task 5: company support listing fails closed without a tenant", () => {
  assert.throws(
    () => listStaffTickets({ role: "company", company: null }, null),
    (error) => error instanceof AppError && error.statusCode === 403,
  );
});

test("Task 5: ticket validation rejects missing booking context and oversized messages", () => {
  assert.equal(createSupportTicketSchema.safeParse({ body: { subject: "Help" } }).success, false);
  assert.equal(
    supportMessageSchema.safeParse({
      params: { id: ticketId },
      body: { message: "x".repeat(2001) },
    }).success,
    false,
  );
});
