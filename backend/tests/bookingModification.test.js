import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Vehicle from "../models/vehicle_model.js";
import Payment from "../models/payment_model.js";
import { modifyBookingSchema } from "../validations/booking.validation.js";
import { modifyUnpaidCustomerBooking } from "../services/bookingService.js";

const bookingId = "111111111111111111111111";
const customerId = "222222222222222222222222";
const vehicleId = "333333333333333333333333";
const futureStart = "2027-01-10T10:00:00.000Z";
const futureEnd = "2027-01-13T10:00:00.000Z";

const validPayload = {
  startDate: futureStart,
  endDate: futureEnd,
  pickupLocation: "Tripoli Airport",
  pickupMethod: "DELIVERY",
  addonIds: ["insurance"],
};

test("booking modification validation accepts a complete future itinerary", () => {
  const result = modifyBookingSchema.safeParse({
    params: { id: bookingId },
    body: validPayload,
  });
  assert.equal(result.success, true);
});

test("booking modification validation rejects client-controlled prices and invalid ranges", () => {
  const result = modifyBookingSchema.safeParse({
    params: { id: bookingId },
    body: { ...validPayload, endDate: futureStart, totalAmount: 1 },
  });
  assert.equal(result.success, false);
});

const queryWithSession = (value) => ({ session: async () => value });

test("unpaid modification excludes itself from collision checks and synchronizes pending payment", async (t) => {
  const session = {
    async withTransaction(fn) { await fn(); },
    async endSession() {},
  };
  const booking = {
    _id: bookingId,
    customerId,
    vehicleId,
    bookingStatus: "PENDING_PAYMENT",
    paymentStatus: "UNPAID",
    paymentSessionExpiresAt: new Date(),
    totalAmount: 975,
    async save({ session: usedSession }) {
      assert.equal(usedSession, session);
      this.totalAmount = 1425;
      return this;
    },
  };
  const payment = {
    amount: 975,
    merchantReference: "old-reference",
    async save({ session: usedSession }) {
      assert.equal(usedSession, session);
      return this;
    },
  };
  let collisionFilter;

  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(Booking, "findById", () => queryWithSession(booking));
  t.mock.method(Vehicle, "findOneAndUpdate", async () => ({ _id: vehicleId }));
  t.mock.method(Booking, "findOne", (filter) => {
    collisionFilter = filter;
    return queryWithSession(null);
  });
  t.mock.method(Payment, "findOne", () => queryWithSession(payment));

  const result = await modifyUnpaidCustomerBooking(
    bookingId,
    customerId,
    validPayload,
  );

  assert.equal(result, booking);
  assert.deepEqual(collisionFilter._id, { $ne: bookingId });
  assert.equal(booking.pickupLocation, "Tripoli Airport");
  assert.equal(booking.pickupMethod, "DELIVERY");
  assert.deepEqual(booking.addonIds, ["insurance"]);
  assert.equal(booking.paymentSessionExpiresAt, null);
  assert.equal(payment.amount, 1425);
  assert.equal(payment.merchantReference, undefined);
});

test("paid booking modification is rejected before any itinerary mutation", async (t) => {
  const session = {
    async withTransaction(fn) { await fn(); },
    async endSession() {},
  };
  const booking = {
    _id: bookingId,
    customerId,
    vehicleId,
    bookingStatus: "PAID",
    paymentStatus: "PAID",
  };
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(Booking, "findById", () => queryWithSession(booking));

  await assert.rejects(
    modifyUnpaidCustomerBooking(bookingId, customerId, validPayload),
    (error) => error.statusCode === 409 && /cannot be changed online/.test(error.message),
  );
  assert.equal(booking.startDate, undefined);
});

test("modification rejects an overlapping reservation without changing the booking", async (t) => {
  const session = {
    async withTransaction(fn) { await fn(); },
    async endSession() {},
  };
  const booking = {
    _id: bookingId,
    customerId,
    vehicleId,
    bookingStatus: "PENDING_PAYMENT",
    paymentStatus: "UNPAID",
  };
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(Booking, "findById", () => queryWithSession(booking));
  t.mock.method(Vehicle, "findOneAndUpdate", async () => ({ _id: vehicleId }));
  t.mock.method(Booking, "findOne", () => queryWithSession({ _id: "conflict" }));

  await assert.rejects(
    modifyUnpaidCustomerBooking(bookingId, customerId, validPayload),
    (error) => error.statusCode === 409 && /already booked/.test(error.message),
  );
  assert.equal(booking.startDate, undefined);
});
