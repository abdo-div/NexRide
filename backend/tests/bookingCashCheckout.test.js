import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import Vehicle from "../models/vehicle_model.js";
import {
  bookingConcurrency,
  createBooking,
} from "../controllers/bookingController.js";

const userId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const vehicleId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const companyId = "cccccccccccccccccccccccc";

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
      if (error) resolve({ statusCode: error.statusCode, error });
      else resolve({ statusCode, body: undefined });
    });
  });

const runCreateBooking = async (
  t,
  paymentMethod,
  {
    redisAvailable = true,
    redisAvailableAfterFirstCheck = redisAvailable,
    holdSuccess = true,
    lockSuccess = true,
    collision = null,
  } = {},
) => {
  const vehicle = {
    _id: vehicleId,
    companyId,
    dailyPrice: 100,
    pickupLocation: "Tripoli depot",
  };
  const session = {
    committed: false,
    aborted: false,
    startTransaction() {},
    async commitTransaction() { this.committed = true; },
    async abortTransaction() { this.aborted = true; },
    endSession() {},
  };
  const bookingCreateOptions = [];
  const paymentCreateOptions = [];
  const concurrencyCalls = {
    availability: 0,
    holds: [],
    locks: [],
    releasedHolds: [],
    releasedLocks: 0,
  };
  let collisionQuery;
  let vehicleQuery;
  let sessionStarts = 0;
  let bookingCreates = 0;
  const lock = {
    released: false,
    async release() {
      this.released = true;
      concurrencyCalls.releasedLocks += 1;
    },
  };

  t.mock.method(bookingConcurrency, "isRedisAvailable", async () => {
    concurrencyCalls.availability += 1;
    return concurrencyCalls.availability === 1
      ? redisAvailable
      : redisAvailableAfterFirstCheck;
  });
  t.mock.method(bookingConcurrency, "holdVehicleForCheckout", async (id, actorId) => {
    concurrencyCalls.holds.push({ id, actorId });
    return holdSuccess
      ? { success: true }
      : { success: false, message: "Vehicle is currently held by another user." };
  });
  t.mock.method(bookingConcurrency, "acquireVehicleLock", async (id, ttl) => {
    concurrencyCalls.locks.push({ id, ttl });
    if (!lockSuccess) throw new Error("Redis internal details must not leak");
    return lock;
  });
  t.mock.method(bookingConcurrency, "releaseVehicleHold", async (id) => {
    concurrencyCalls.releasedHolds.push(id);
  });
  t.mock.method(mongoose, "startSession", async () => {
    sessionStarts += 1;
    return session;
  });
  t.mock.method(Vehicle, "findOne", (filter) => {
    vehicleQuery = filter;
    return { session: async () => vehicle };
  });
  t.mock.method(Booking, "findOne", (filter) => {
    collisionQuery = filter;
    return { session: async () => collision };
  });
  t.mock.method(Booking, "create", async (documents, options) => {
    bookingCreates += 1;
    bookingCreateOptions.push(options);
    return [{ ...documents[0], _id: "dddddddddddddddddddddddd" }];
  });
  t.mock.method(Payment, "create", async (documents, options) => {
    paymentCreateOptions.push({ documents, options });
    return documents.map((document) => ({
      ...document,
      _id: "eeeeeeeeeeeeeeeeeeeeeeee",
    }));
  });

  const response = await invoke(createBooking, {
    user: { id: userId },
    body: {
      vehicleId,
      startDate: "2026-11-01T10:00:00.000Z",
      endDate: "2026-11-04T10:00:00.000Z",
      ...(paymentMethod ? { paymentMethod } : {}),
    },
  });

  return {
    response,
    session,
    lock,
    vehicleQuery,
    collisionQuery,
    bookingCreateOptions,
    paymentCreateOptions,
    concurrencyCalls,
    sessionStarts,
    bookingCreates,
  };
};

test("cash checkout creates a pending cash ledger entry atomically with an unpaid booking", async (t) => {
  const result = await runCreateBooking(t, "CASH_ON_DELIVERY");
  const { response, session, vehicleQuery, collisionQuery, paymentCreateOptions } = result;
  const booking = response.body.data.booking;
  const payment = response.body.data.payment;

  assert.equal(response.statusCode, 201);
  assert.equal(booking.bookingStatus, "PENDING_PAYMENT");
  assert.equal(booking.paymentStatus, "UNPAID");
  assert.equal(payment.bookingId, booking._id);
  assert.equal(payment.amount, booking.totalAmount);
  assert.equal(payment.paymentMethod, "CASH_ON_DELIVERY");
  assert.equal(payment.status, "PENDING");
  assert.equal(payment.paidAt, undefined);
  assert.equal(paymentCreateOptions.length, 1);
  assert.equal(paymentCreateOptions[0].options.session, session);
  assert.equal(result.bookingCreateOptions[0].session, session);
  assert.equal(session.committed, true);
  assert.equal(session.aborted, false);
  assert.deepEqual(result.concurrencyCalls.holds, [{ id: vehicleId, actorId: userId }]);
  assert.deepEqual(result.concurrencyCalls.locks, [{ id: vehicleId, ttl: 10000 }]);
  assert.equal(result.concurrencyCalls.releasedLocks, 1);
  assert.deepEqual(result.concurrencyCalls.releasedHolds, [vehicleId]);
  assert.equal(vehicleQuery._id, vehicleId);
  assert.equal(vehicleQuery.listingStatus, "PUBLISHED");
  assert.equal(vehicleQuery.operationalStatus, "AVAILABLE");
  assert.equal(collisionQuery.vehicleId, vehicleId);
});

test("card checkout creation remains pending without a cash payment record", async (t) => {
  const { response, session, paymentCreateOptions } = await runCreateBooking(t);

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.data.booking.bookingStatus, "PENDING_PAYMENT");
  assert.equal(response.body.data.booking.paymentStatus, "UNPAID");
  assert.equal(response.body.data.payment, undefined);
  assert.equal(paymentCreateOptions.length, 0);
  assert.equal(session.committed, true);
});

test("booking creation fails closed when Redis is unavailable", async (t) => {
  const result = await runCreateBooking(t, undefined, { redisAvailable: false });

  assert.equal(result.response.statusCode, 503);
  assert.match(result.response.error.message, /temporarily unavailable/);
  assert.doesNotMatch(result.response.error.message, /Redis internal/);
  assert.equal(result.sessionStarts, 0);
  assert.equal(result.bookingCreates, 0);
  assert.equal(result.concurrencyCalls.holds.length, 0);
  assert.equal(result.concurrencyCalls.locks.length, 0);
});

test("booking creation stops when the checkout hold cannot be acquired", async (t) => {
  const result = await runCreateBooking(t, undefined, { holdSuccess: false });

  assert.equal(result.response.statusCode, 409);
  assert.equal(result.sessionStarts, 0);
  assert.equal(result.bookingCreates, 0);
  assert.equal(result.concurrencyCalls.locks.length, 0);
});

test("booking creation releases its hold and creates nothing when lock acquisition fails", async (t) => {
  const result = await runCreateBooking(t, undefined, { lockSuccess: false });

  assert.equal(result.response.statusCode, 429);
  assert.match(result.response.error.message, /processing another checkout/);
  assert.doesNotMatch(result.response.error.message, /Redis internal/);
  assert.equal(result.sessionStarts, 0);
  assert.equal(result.bookingCreates, 0);
  assert.deepEqual(result.concurrencyCalls.releasedHolds, [vehicleId]);
});

test("booking creation returns unavailable if Redis drops during lock acquisition", async (t) => {
  const result = await runCreateBooking(t, undefined, {
    lockSuccess: false,
    redisAvailableAfterFirstCheck: false,
  });

  assert.equal(result.response.statusCode, 503);
  assert.match(result.response.error.message, /temporarily unavailable/);
  assert.doesNotMatch(result.response.error.message, /Redis internal/);
  assert.equal(result.sessionStarts, 0);
  assert.equal(result.bookingCreates, 0);
  assert.deepEqual(result.concurrencyCalls.releasedHolds, [vehicleId]);
});

test("existing booking collision aborts the transaction and releases concurrency controls", async (t) => {
  const collision = { _id: "ffffffffffffffffffffffff", bookingStatus: "CONFIRMED" };
  const result = await runCreateBooking(t, undefined, { collision });

  assert.equal(result.response.statusCode, 409);
  assert.equal(result.session.committed, false);
  assert.equal(result.session.aborted, true);
  assert.equal(result.bookingCreates, 0);
  assert.equal(result.concurrencyCalls.releasedLocks, 1);
  assert.deepEqual(result.concurrencyCalls.releasedHolds, [vehicleId]);
});