import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import Vehicle from "../models/vehicle_model.js";
import MaintenanceEvent from "../models/Maintenance_model.js";
import { redisClient } from "../config/redis.js";
import {
  releasePayment,
  verifyPayment,
} from "../controllers/moamalatController.js";
import { releaseUnpaidBooking } from "../services/bookingService.js";
import { protect } from "../middlewares/authMiddleware.js";
import moamalatRouter from "../routes/moamalatRoutes.js";

const customerA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const customerB = "bbbbbbbbbbbbbbbbbbbbbbbb";
const bookingId = "111111111111111111111111";
const companyId = "222222222222222222222222";
const vehicleId = "333333333333333333333333";
const merchantReference = "NX-1111111111-test-reference";

const makeBooking = (overrides = {}) => ({
  _id: bookingId,
  customerId: customerA,
  companyId,
  vehicleId,
  totalAmount: 88.25,
  bookingStatus: "PENDING_PAYMENT",
  paymentStatus: "UNPAID",
  cancellationReason: null,
  async save() {
    /* persisted outcome is asserted on the object itself */
  },
  ...overrides,
});

const thenableWithSession = (value) => {
  const query = Promise.resolve(value);
  query.session = () => query;
  return query;
};

const stubTransaction = (t) => {
  let started = 0;
  t.mock.method(mongoose, "startSession", async () => {
    started += 1;
    return {
      startTransaction() {},
      commitTransaction() {},
      abortTransaction() {},
      async endSession() {},
    };
  });
  return () => started;
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

const customerRequest = (body) => ({
  body,
  user: { _id: customerA, id: customerA, role: "customer" },
});

// ---------------------------------------------------------------------------
// Service: an unpaid reservation is retired and the car returned to the market
// ---------------------------------------------------------------------------

test("releaseUnpaidBooking expires the reservation and frees the vehicle", async (t) => {
  const booking = makeBooking();
  stubTransaction(t);
  t.mock.method(Booking, "findById", () => thenableWithSession(booking));
  let paymentsFilter = null;
  t.mock.method(Payment, "updateMany", async (filter) => {
    paymentsFilter = filter;
    return { modifiedCount: 1 };
  });
  t.mock.method(MaintenanceEvent, "exists", () =>
    thenableWithSession(null),
  );
  let vehicleUpdate = null;
  t.mock.method(Vehicle, "findByIdAndUpdate", async (id, update) => {
    vehicleUpdate = { id, update };
  });
  let releasedHold = null;
  t.mock.method(redisClient, "del", async (key) => {
    releasedHold = key;
  });

  const result = await releaseUnpaidBooking(bookingId);

  assert.equal(result.released, true);
  assert.equal(booking.bookingStatus, "EXPIRED");
  assert.equal(booking.paymentStatus, "UNPAID");
  assert.deepEqual(paymentsFilter, { bookingId, status: "PENDING" });
  assert.deepEqual(vehicleUpdate, {
    id: vehicleId,
    update: { $set: { operationalStatus: "AVAILABLE" } },
  });
  assert.equal(releasedHold, `hold:vehicle:${vehicleId}`);
});

test("releaseUnpaidBooking never undoes a maintenance lock", async (t) => {
  const booking = makeBooking();
  stubTransaction(t);
  t.mock.method(Booking, "findById", () => thenableWithSession(booking));
  t.mock.method(Payment, "updateMany", async () => ({ modifiedCount: 0 }));
  t.mock.method(MaintenanceEvent, "exists", () =>
    thenableWithSession({ _id: "maintenance" }),
  );
  let vehicleUpdates = 0;
  t.mock.method(Vehicle, "findByIdAndUpdate", async () => {
    vehicleUpdates += 1;
  });
  t.mock.method(redisClient, "del", async () => {});

  const result = await releaseUnpaidBooking(bookingId);

  assert.equal(result.released, true);
  assert.equal(booking.bookingStatus, "EXPIRED");
  assert.equal(vehicleUpdates, 0);
});

test("releaseUnpaidBooking is a no-op once the booking is paid", async (t) => {
  const booking = makeBooking({
    bookingStatus: "PAID",
    paymentStatus: "PAID",
  });
  const started = stubTransaction(t);
  t.mock.method(Booking, "findById", () => thenableWithSession(booking));
  t.mock.method(Payment, "updateMany", async () => {
    throw new Error("a paid booking must not touch the ledger");
  });

  const result = await releaseUnpaidBooking(bookingId);

  assert.equal(result.released, false);
  assert.equal(result.bookingStatus, "PAID");
  assert.equal(started(), 0);
  assert.equal(booking.bookingStatus, "PAID");
});

test("releaseUnpaidBooking reports a missing booking", async (t) => {
  stubTransaction(t);
  t.mock.method(Booking, "findById", () => thenableWithSession(null));

  await assert.rejects(() => releaseUnpaidBooking(bookingId), {
    statusCode: 404,
  });
});

// ---------------------------------------------------------------------------
// Controller: only the owning customer may release their booking
// ---------------------------------------------------------------------------

test("releasePayment releases the owner's unpaid booking", async (t) => {
  const booking = makeBooking();
  stubTransaction(t);
  t.mock.method(Booking, "findById", () => thenableWithSession(booking));
  t.mock.method(Payment, "updateMany", async () => ({ modifiedCount: 1 }));
  t.mock.method(MaintenanceEvent, "exists", () =>
    thenableWithSession(null),
  );
  t.mock.method(Vehicle, "findByIdAndUpdate", async () => {});
  t.mock.method(redisClient, "del", async () => {});

  const outcome = await invoke(
    releasePayment,
    customerRequest({ bookingId }),
  );

  assert.equal(outcome.statusCode, 200);
  assert.equal(outcome.body.data.released, true);
  assert.equal(outcome.body.data.bookingStatus, "EXPIRED");
});

test("releasePayment refuses another customer's booking", async (t) => {
  t.mock.method(Booking, "findById", () =>
    thenableWithSession(makeBooking({ customerId: customerB })),
  );

  const outcome = await invoke(
    releasePayment,
    customerRequest({ bookingId }),
  );

  assert.equal(outcome.error.statusCode, 403);
});

test("the release route is protected and customer-only", () => {
  const layer = moamalatRouter.stack.find(
    (item) => item.route?.path === "/release",
  );
  assert.ok(layer, "expected the /release route");
  const handlers = layer.route.stack.map((item) => item.handle);
  assert.equal(handlers[0], protect);

  const roleError = { statusCode: undefined };
  handlers[1]({ user: { role: "company" } }, {}, (err) => {
    roleError.statusCode = err?.statusCode;
  });
  assert.equal(roleError.statusCode, 403);
});

// ---------------------------------------------------------------------------
// Verification: a rejected payment must not keep the car rented
// ---------------------------------------------------------------------------

const withGatewayConfig = (t) => {
  const keys = ["MOAMALAT_MID", "MOAMALAT_TID", "MOAMALAT_SECURE_KEY"];
  const oldValues = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
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

const withGatewayStatus = (t, status) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const requestBody = JSON.parse(options.body);
    return Response.json({
      Transactions: [
        {
          DateTransactions: [
            {
              MerchantReference: requestBody.MerchantReference,
              AmountTrxn: "88250",
              Status: status,
            },
          ],
        },
      ],
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
};

test("a declined Moamalat transaction expires the booking and frees the car", async (t) => {
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
  stubTransaction(t);
  t.mock.method(Booking, "findById", () => thenableWithSession(booking));
  t.mock.method(Payment, "updateMany", async () => ({ modifiedCount: 1 }));
  t.mock.method(MaintenanceEvent, "exists", () =>
    thenableWithSession(null),
  );
  t.mock.method(Vehicle, "findByIdAndUpdate", async () => {});
  t.mock.method(redisClient, "del", async () => {});
  withGatewayStatus(t, "Declined");

  const outcome = await invoke(verifyPayment, {
    body: { merchantReference },
  });

  assert.equal(outcome.body.verified, false);
  assert.equal(booking.bookingStatus, "EXPIRED");
  assert.equal(booking.paymentStatus, "UNPAID");
});

test("a not-yet-indexed transaction releases the unpaid reservation", async (t) => {
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
  t.mock.method(Booking, "findById", () => thenableWithSession(booking));
  const started = stubTransaction(t);
  t.mock.method(Payment, "updateMany", async () => ({ modifiedCount: 1 }));
  t.mock.method(MaintenanceEvent, "exists", () => thenableWithSession(null));
  t.mock.method(Vehicle, "findByIdAndUpdate", async () => {});
  t.mock.method(redisClient, "del", async () => {});
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      Transactions: [
        {
          DateTransactions: [
            {
              MerchantReference: "unrelated-reference",
              AmountTrxn: "88250",
              Status: "Approved",
            },
          ],
        },
      ],
    });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const outcome = await invoke(verifyPayment, {
    body: { merchantReference },
  });

  assert.equal(outcome.body.verified, false);
  assert.equal(started(), 1);
  assert.equal(booking.bookingStatus, "EXPIRED");
  assert.equal(booking.paymentStatus, "UNPAID");
});
