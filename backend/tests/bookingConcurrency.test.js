import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import Vehicle from "../models/vehicle_model.js";
import { bookingConcurrency, createBooking } from "../controllers/bookingController.js";

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

const runBookingRequest = async (t, opts = {}) => {
  const {
    claim = true,
    collision = null,
    writeConflict = false,
    vehicleOverride = {},
  } = opts;
  const vehicle = {
    _id: vehicleId,
    companyId,
    dailyPrice: 100,
    pickupLocation: "Tripoli depot",
    listingStatus: "PUBLISHED",
    operationalStatus: "AVAILABLE",
    ...vehicleOverride,
  };
  const session = {
    committed: false,
    aborted: false,
    startTransaction() {},
    async commitTransaction() {
      this.committed = true;
    },
    async abortTransaction() {
      this.aborted = true;
    },
    endSession() {},
  };
  const lock = {
    released: false,
    async release() {
      this.released = true;
    },
  };
  const captures = {
    claimFilter: null,
    claimOptions: [],
    restoreCalls: [],
    collisionQuery: null,
    sessionStarts: 0,
    bookingCreates: 0,
  };

  t.mock.method(bookingConcurrency, "isRedisAvailable", async () => true);
  t.mock.method(
    bookingConcurrency,
    "holdVehicleForCheckout",
    async () => ({ success: true }),
  );
  t.mock.method(bookingConcurrency, "acquireVehicleLock", async () => lock);
  t.mock.method(bookingConcurrency, "releaseVehicleHold", async () => {});
  t.mock.method(mongoose, "startSession", async () => {
    captures.sessionStarts += 1;
    return session;
  });
  t.mock.method(Vehicle, "findById", () => ({
    session: async () => vehicle,
  }));
  t.mock.method(Vehicle, "findOneAndUpdate", async (filter, update, options) => {
    if (update.$set?.operationalStatus === "UNAVAILABLE") {
      captures.claimFilter = filter;
      captures.claimOptions.push(options);
      // The losing concurrent checkout observes the vehicle mid-claim and the
      // conditional update matches nothing - exactly like the real DB when a
      // sibling transaction already latched the row.
      return claim ? vehicle : null;
    }
    captures.restoreCalls.push({ filter, update, options });
    return { ...vehicle, operationalStatus: "AVAILABLE" };
  });
  t.mock.method(Booking, "findOne", (filter) => {
    captures.collisionQuery = filter;
    return {
      session: async () => {
        if (writeConflict) {
          const error = new Error(
            "WriteConflict: write conflict with another transaction",
          );
          error.code = 112;
          throw error;
        }
        return collision;
      },
    };
  });
  t.mock.method(Booking, "create", async (documents) => {
    captures.bookingCreates += 1;
    return [{ ...documents[0], _id: "dddddddddddddddddddddddd" }];
  });
  t.mock.method(Payment, "create", async (documents, options) =>
    documents.map((document) => ({
      ...document,
      _id: "eeeeeeeeeeeeeeeeeeeeeeee",
      ...options,
    })),
  );

  const response = await invoke(createBooking, {
    user: { id: userId },
    body: {
      vehicleId,
      startDate: "2026-11-01T10:00:00.000Z",
      endDate: "2026-11-04T10:00:00.000Z",
    },
  });

  return { response, session, lock, captures };
};

test("P1-1: two concurrent checkouts for the same vehicle - one succeeds, the loser gets a clean 409", async (t) => {
  const winner = await runBookingRequest(t, { claim: true });
  const loser = await runBookingRequest(t, { claim: false });

  assert.equal(winner.response.statusCode, 201);
  assert.equal(winner.session.committed, true);
  assert.equal(winner.session.aborted, false);
  assert.equal(winner.lock.released, true);
  assert.equal(winner.captures.restoreCalls.length, 1);
  assert.equal(winner.captures.bookingCreates, 1);

  // The loser never sees the booking; its write is refused before any insert.
  assert.equal(loser.response.statusCode, 409);
  assert.match(loser.response.error.message, /being booked by another customer/);
  assert.equal(loser.session.committed, false);
  assert.equal(loser.session.aborted, true);
  assert.equal(loser.captures.bookingCreates, 0);
  assert.equal(loser.captures.restoreCalls.length, 0);
  assert.equal(loser.lock.released, true);
});

test("P1-1: booking creation aborts and returns 409 when the in-session collision check finds an overlap", async (t) => {
  const collision = { _id: "ffffffffffffffffffffffff", bookingStatus: "PAID" };
  const result = await runBookingRequest(t, { collision });

  assert.equal(result.response.statusCode, 409);
  assert.match(result.response.error.message, /already booked during these dates/);
  assert.equal(result.session.aborted, true);
  assert.equal(result.session.committed, false);
  assert.equal(result.captures.bookingCreates, 0);
});

test("P1-1: a transient WriteConflict on the vehicle row surfaces as 409, never a 500", async (t) => {
  const result = await runBookingRequest(t, { writeConflict: true });

  assert.equal(result.response.statusCode, 409);
  assert.match(result.response.error.message, /already being booked during these dates/);
  assert.equal(result.session.aborted, true);
  assert.equal(result.captures.bookingCreates, 0);
});

test("P1-1: the overlap guard is scoped to the requested window with the DB-side overlap filter", async (t) => {
  const result = await runBookingRequest(t, {});

  assert.equal(result.response.statusCode, 201);
  assert.equal(result.captures.collisionQuery.vehicleId, vehicleId);
  assert.deepEqual(result.captures.collisionQuery.bookingStatus.$in, [
    "PENDING_PAYMENT",
    "PAID",
    "CONFIRMED",
    "ACTIVE",
  ]);
});

test("P1-2c: a vehicle locked for maintenance cannot be checked out", async (t) => {
  const result = await runBookingRequest(t, {
    vehicleOverride: { operationalStatus: "MAINTENANCE" },
  });

  assert.equal(result.response.statusCode, 409);
  assert.match(result.response.error.message, /maintenance or already out of service/);
  assert.equal(result.session.aborted, true);
  assert.equal(result.captures.claimOptions.length, 0, "no claim attempted on a maintenance unit");
  assert.equal(result.captures.bookingCreates, 0);
});

test("P1-1: a vehicle with an unpublished listing is surfaced as not available, not claimable", async (t) => {
  const result = await runBookingRequest(t, {
    vehicleOverride: { listingStatus: "DRAFT" },
  });

  assert.equal(result.response.statusCode, 404);
  assert.match(result.response.error.message, /not available for rental/);
  assert.equal(result.session.aborted, true);
  assert.equal(result.captures.claimOptions.length, 0);
  assert.equal(result.captures.bookingCreates, 0);
});