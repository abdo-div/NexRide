import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import Vehicle from "../models/vehicle_model.js";
import { redisClient } from "../config/redis.js";
import { createPayment, verifyPayment } from "../controllers/moamalatController.js";
import { protect } from "../middlewares/authMiddleware.js";
import moamalatRouter from "../routes/moamalatRoutes.js";
import { initiatePaymentSchema } from "../validations/moamalat.validation.js";

const customerA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const customerB = "bbbbbbbbbbbbbbbbbbbbbbbb";
const bookingId = "111111111111111111111111";
const companyId = "222222222222222222222222";
const merchantReference = "NX-1111111111-test-reference";

const makeBooking = (overrides = {}) => ({
  _id: bookingId,
  customerId: customerA,
  companyId,
  vehicleId: "333333333333333333333333",
  totalAmount: 88.25,
  bookingStatus: "PENDING_PAYMENT",
  paymentStatus: "UNPAID",
  ...overrides,
});

const withGatewayConfig = (t) => {
  const keys = ["MOAMALAT_MID", "MOAMALAT_TID", "MOAMALAT_SECURE_KEY"];
  const oldValues = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.MOAMALAT_MID = "test-mid";
  process.env.MOAMALAT_TID = "test-tid";
  process.env.MOAMALAT_SECURE_KEY = "ab".repeat(32);
  t.after(() => {
    for (const key of keys) {
      if (oldValues[key] === undefined) delete process.env[key];
      else process.env[key] = oldValues[key];
    }
  });
};

const invoke = (handler, req) =>
  new Promise((resolve, reject) => {
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
      if (error) reject(error);
      else resolve({ statusCode, body: undefined });
    });
  });

const customerRequest = (body) => ({
  body,
  user: { _id: customerA, id: customerA, role: "customer" },
});

const routeHandlers = (path) => {
  const layer = moamalatRouter.stack.find((item) => item.route?.path === path);
  assert.ok(layer, `expected Moamalat route ${path}`);
  return layer.route.stack.map((item) => item.handle);
};

test("Moamalat create and init are protected and customer-only", async () => {
  for (const path of ["/create", "/init"]) {
    const handlers = routeHandlers(path);
    assert.equal(handlers[0], protect);
    assert.equal(handlers.length, 5);

    const roleError = await new Promise((resolve) =>
      handlers[1]({ user: { role: "company" } }, {}, resolve),
    );
    assert.equal(roleError.statusCode, 403);
  }

  const authError = await new Promise((resolve) =>
    protect({ headers: {} }, { locals: {} }, resolve),
  );
  assert.equal(authError.statusCode, 401);
});

test("Moamalat initialization schema rejects caller-supplied money and reference", () => {
  assert.throws(() =>
    initiatePaymentSchema.parse({
      body: { bookingId, amount: 0.01 },
    }),
  );
  assert.throws(() =>
    initiatePaymentSchema.parse({
      body: { bookingId, total: 0.01 },
    }),
  );
  assert.throws(() =>
    initiatePaymentSchema.parse({
      body: { bookingId, reference: "chosen-by-client" },
    }),
  );
});

test("initialization checks ownership and signs the database booking amount", async (t) => {
  withGatewayConfig(t);
  const booking = makeBooking();
  t.mock.method(Booking, "findById", async () => booking);
  t.mock.method(Payment, "findOne", async (filter) =>
    filter.status === "COMPLETED" ? null : null,
  );
  const savedPayments = [];
  t.mock.method(Payment.prototype, "save", async function () {
    savedPayments.push(this);
    return this;
  });

  const response = await invoke(createPayment, customerRequest({ bookingId }));
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.AmountTrxn, "88250");
  assert.equal(response.body.data.payment.amount, booking.totalAmount);
  assert.equal(response.body.data.payment.bookingId, bookingId);
  assert.ok(response.body.SecureHash);
  assert.equal(savedPayments.length, 1);
  assert.equal(savedPayments[0].amount, booking.totalAmount);
  assert.equal(savedPayments[0].status, "PENDING");
  assert.equal(savedPayments[0].merchantReference, response.body.MerchantReference);

  const foreignBooking = makeBooking({ customerId: customerB });
  Booking.findById.mock.mockImplementation(async () => foreignBooking);
  await assert.rejects(
    invoke(createPayment, customerRequest({ bookingId })),
    { statusCode: 403 },
  );
  assert.equal(savedPayments.length, 1);
});

test("initialization rejects monetary overrides, paid bookings, and cancelled bookings", async (t) => {
  withGatewayConfig(t);
  const booking = makeBooking();
  t.mock.method(Booking, "findById", async () => booking);
  t.mock.method(Payment, "findOne", async (filter) =>
    filter.status === "COMPLETED" ? null : null,
  );
  t.mock.method(Payment.prototype, "save", async function () {
    return this;
  });

  await assert.rejects(
    invoke(createPayment, customerRequest({ bookingId, amount: 0.01 })),
    { statusCode: 400 },
  );

  booking.bookingStatus = "PAID";
  booking.paymentStatus = "PAID";
  await assert.rejects(
    invoke(createPayment, customerRequest({ bookingId })),
    { statusCode: 409 },
  );

  booking.bookingStatus = "CANCELLED";
  booking.paymentStatus = "UNPAID";
  await assert.rejects(
    invoke(createPayment, customerRequest({ bookingId })),
    { statusCode: 409 },
  );
});

test("verification without a matching approved Moamalat transaction does not finalize", async (t) => {
  withGatewayConfig(t);
  const booking = makeBooking();
  const payment = {
    _id: "444444444444444444444444",
    bookingId,
    amount: booking.totalAmount,
    paymentGateway: "MOAMALAT",
    paymentMethod: "MOAMALAT",
    status: "PENDING",
  };
  t.mock.method(Payment, "findOne", async () => payment);
  t.mock.method(Booking, "findById", async () => booking);
  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return Response.json({
      Transactions: [
        {
          DateTransactions: [
            { MerchantReference: "unrelated-reference", AmountTrxn: "88250", Status: "Approved" },
          ],
        },
      ],
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await invoke(verifyPayment, {
    body: { merchantReference },
  });
  assert.equal(response.body.verified, false);
  assert.equal(fetchCount, 1);
  assert.equal(booking.bookingStatus, "PENDING_PAYMENT");
  assert.equal(booking.paymentStatus, "UNPAID");
});

test("verified amount must match the stored booking, and repeated verification is idempotent", async (t) => {
  withGatewayConfig(t);
  const booking = makeBooking();
  const payment = {
    _id: "444444444444444444444444",
    bookingId,
    amount: booking.totalAmount,
    paymentGateway: "MOAMALAT",
    paymentMethod: "MOAMALAT",
    status: "PENDING",
    async save() {
      this.status = "COMPLETED";
      this.paidAt = new Date();
    },
  };
  let bookingSaveCount = 0;
  booking.save = async () => {
    bookingSaveCount += 1;
  };
  let vehicleUpdateCount = 0;
  let redisDeleteCount = 0;
  const transaction = { commitTransaction: async () => {}, abortTransaction: async () => {}, endSession() {} };

  const bookingQuery = () => {
    const query = Promise.resolve(booking);
    query.session = async () => booking;
    query.select = async () => booking;
    return query;
  };
  const paymentQuery = () => ({ session: async () => payment });
  t.mock.method(mongoose, "startSession", async () => ({
    ...transaction,
    startTransaction() {},
  }));
  t.mock.method(Booking, "findById", bookingQuery);
  t.mock.method(Payment, "findOne", async () => payment);
  t.mock.method(Payment, "findById", paymentQuery);
  t.mock.method(Vehicle, "findByIdAndUpdate", async () => {
    vehicleUpdateCount += 1;
  });
  t.mock.method(redisClient, "del", async () => {
    redisDeleteCount += 1;
  });

  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    fetchCount += 1;
    const requestBody = JSON.parse(options.body);
    return Response.json({
      Transactions: [
        {
          DateTransactions: [
            {
              MerchantReference: requestBody.MerchantReference,
              AmountTrxn: "88250",
              Status: "Approved",
              TransactionId: "gateway-txn-1",
            },
          ],
        },
      ],
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const first = await invoke(verifyPayment, {
    body: { merchantReference },
  });
  assert.equal(first.body.verified, true);
  assert.equal(first.body.data.amount, booking.totalAmount);
  assert.equal(payment.status, "COMPLETED");
  assert.equal(booking.bookingStatus, "PAID");
  assert.equal(booking.paymentStatus, "PAID");

  const repeated = await invoke(verifyPayment, {
    body: { merchantReference },
  });
  assert.equal(repeated.body.verified, true);
  assert.equal(repeated.body.alreadyProcessed, true);
  assert.equal(fetchCount, 1);
  assert.equal(bookingSaveCount, 1);
  assert.equal(vehicleUpdateCount, 1);
  assert.equal(redisDeleteCount, 1);
});