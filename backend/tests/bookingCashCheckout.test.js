import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import Vehicle from "../models/vehicle_model.js";
import { redisClient } from "../config/redis.js";
import { createBooking } from "../controllers/bookingController.js";

const userId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const vehicleId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const companyId = "cccccccccccccccccccccccc";

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

const runCreateBooking = async (t, paymentMethod) => {
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
  let collisionQuery;
  let vehicleQuery;

  t.mock.method(redisClient, "connect", async () => {
    throw new Error("Redis unavailable during isolated test");
  });
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(Vehicle, "findOne", (filter) => {
    vehicleQuery = filter;
    return { session: async () => vehicle };
  });
  t.mock.method(Booking, "findOne", (filter) => {
    collisionQuery = filter;
    return { session: async () => null };
  });
  t.mock.method(Booking, "create", async (documents, options) => {
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
    vehicleQuery,
    collisionQuery,
    bookingCreateOptions,
    paymentCreateOptions,
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