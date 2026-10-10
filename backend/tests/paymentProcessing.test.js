import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import * as paymentService from "../services/paymentService.js";

const customerA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const customerB = "bbbbbbbbbbbbbbbbbbbbbbbb";

const makeBooking = (overrides = {}) => ({
  _id: "111111111111111111111111",
  customerId: customerA,
  companyId: "222222222222222222222222",
  totalAmount: 125.5,
  bookingStatus: "PENDING_PAYMENT",
  paymentStatus: "UNPAID",
  ...overrides,
});

const mockPaymentFlow = (t, booking, completedPayment = null) => {
  const createdPayments = [];
  const transaction = { committed: false, aborted: false };
  const session = {
    startTransaction() {},
    async commitTransaction() {
      transaction.committed = true;
    },
    async abortTransaction() {
      transaction.aborted = true;
    },
    endSession() {},
  };

  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(Booking, "findById", () => ({ session: async () => booking }));
  t.mock.method(Payment, "findOne", () => ({ session: async () => completedPayment }));
  t.mock.method(Payment, "create", async (documents, options) => {
    createdPayments.push({ documents, options });
    return documents;
  });

  return { createdPayments, transaction };
};

test("a customer cannot process another customer's booking", async (t) => {
  const { createdPayments, transaction } = mockPaymentFlow(
    t,
    makeBooking({ customerId: customerB }),
  );

  await assert.rejects(
    paymentService.executePaymentProcessing({ bookingId: "booking-id" }, customerA),
    { statusCode: 403 },
  );
  assert.equal(createdPayments.length, 0);
  assert.equal(transaction.committed, false);
  assert.equal(transaction.aborted, true);
});

test("payment amount comes from the booking and remains pending without capture", async (t) => {
  const booking = makeBooking();
  const { createdPayments, transaction } = mockPaymentFlow(t, booking);

  const payment = await paymentService.executePaymentProcessing(
    { bookingId: booking._id, amount: 0.01, paymentMethod: "LOCAL_CARD" },
    customerA,
  );

  assert.equal(payment.amount, booking.totalAmount);
  assert.equal(payment.status, "PENDING");
  assert.equal(booking.bookingStatus, "PENDING_PAYMENT");
  assert.equal(booking.paymentStatus, "UNPAID");
  assert.equal(createdPayments.length, 1);
  assert.equal(transaction.committed, true);
});

test("an already-paid booking cannot be processed again", async (t) => {
  const { createdPayments, transaction } = mockPaymentFlow(
    t,
    makeBooking({ bookingStatus: "PAID", paymentStatus: "PAID" }),
  );

  await assert.rejects(
    paymentService.executePaymentProcessing({ bookingId: "booking-id" }, customerA),
    { statusCode: 409 },
  );
  assert.equal(createdPayments.length, 0);
  assert.equal(transaction.committed, false);
});

test("a cancelled booking is not payable", async (t) => {
  const { createdPayments } = mockPaymentFlow(
    t,
    makeBooking({ bookingStatus: "CANCELLED" }),
  );

  await assert.rejects(
    paymentService.executePaymentProcessing({ bookingId: "booking-id" }, customerA),
    { statusCode: 409 },
  );
  assert.equal(createdPayments.length, 0);
});

test("cash on delivery is recorded as pending, not collected", async (t) => {
  const booking = makeBooking();
  const { createdPayments } = mockPaymentFlow(t, booking);

  const payment = await paymentService.executePaymentProcessing(
    { bookingId: booking._id, paymentMethod: "CASH_ON_DELIVERY" },
    customerA,
  );

  assert.equal(payment.paymentMethod, "CASH_ON_DELIVERY");
  assert.equal(payment.status, "PENDING");
  assert.equal(payment.paidAt, undefined);
  assert.equal(booking.paymentStatus, "UNPAID");
  assert.equal(booking.bookingStatus, "PENDING_PAYMENT");
  assert.equal(createdPayments.length, 1);
});

test("a completed ledger payment blocks processing even if booking state is stale", async (t) => {
  const completedPayment = { _id: "completed-payment", status: "COMPLETED" };
  const { createdPayments, transaction } = mockPaymentFlow(
    t,
    makeBooking(),
    completedPayment,
  );

  await assert.rejects(
    paymentService.executePaymentProcessing({ bookingId: "booking-id" }, customerA),
    { statusCode: 409 },
  );
  assert.equal(createdPayments.length, 0);
  assert.equal(transaction.committed, false);
});