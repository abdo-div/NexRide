import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Vehicle from "../models/vehicle_model.js";
import MaintenanceEvent from "../models/Maintenance_model.js";
import {
  BOOKING_STATUS_TRANSITIONS,
  updateLifecycleStatus,
} from "../services/bookingService.js";

const vehicleId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const actor = { id: "aaaaaaaaaaaaaaaaaaaaaaaa" };

/**
 * Builds a mutable booking double. The service mutates `booking.bookingStatus`
 * and calls `save`, so the object's own status must reflect each write to let
 * successive transitions chain.
 */
const bookingDouble = ({ bookingStatus, paymentStatus, cancelledBy = null } = {}) => {
  const booking = {
    bookingStatus,
    paymentStatus,
    vehicleId,
    cancelledBy,
    cancelledAt: null,
    cancellationReason: null,
    savedSessions: [],
    async save({ session } = {}) {
      this.savedSessions.push(session);
      return this;
    },
  };
  return booking;
};

const stageService = (t, booking, { openMaintenance = false } = {}) => {
  const session = {
    commits: 0,
    aborts: 0,
    startTransaction() {},
    async commitTransaction() {
      this.commits += 1;
    },
    async abortTransaction() {
      this.aborts += 1;
    },
    endSession() {},
  };
  const counts = { maintenanceChecks: 0 };
  const vehicleWrites = [];

  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(Booking, "findById", async () => booking);
  t.mock.method(Vehicle, "findByIdAndUpdate", async (filter, update, options) => {
    vehicleWrites.push({ filter, update, options });
    return { _id: vehicleId, operationalStatus: update.$set.operationalStatus };
  });
  t.mock.method(MaintenanceEvent, "exists", () => ({
    session: async () => {
      counts.maintenanceChecks += 1;
      return openMaintenance ? { _id: "dddddddddddddddddddddddd" } : null;
    },
  }));

  return { session, vehicleWrites, counts };
};

const expectRejectedTransition = (t, from, target, paymentStatus = "PAID") => {
  const booking = bookingDouble({ bookingStatus: from, paymentStatus });
  stageService(t, booking);
  return assert.rejects(
    updateLifecycleStatus(booking._id ?? "000000000000000000000000", target, actor),
    (err) => err.statusCode === 400,
    `${from} -> ${target} must be rejected`,
  );
};

test("every booking status has a declared transition map (matrix is total)", () => {
  const states = [
    "PENDING_PAYMENT",
    "PAID",
    "CONFIRMED",
    "ACTIVE",
    "COMPLETED",
    "CANCELLED",
    "EXPIRED",
  ];
  for (const state of states) {
    assert.ok(
      Array.isArray(BOOKING_STATUS_TRANSITIONS[state]),
      `${state} must be a key of the transition map`,
    );
  }
  // Terminal states can never move again.
  for (const terminal of ["COMPLETED", "CANCELLED", "EXPIRED"]) {
    assert.equal(BOOKING_STATUS_TRANSITIONS[terminal].length, 0);
  }
  // EXPIRED is never a valid API target (only the expiry reaper may set it).
  assert.equal(BOOKING_STATUS_TRANSITIONS.CONFIRMED.includes("EXPIRED"), false);
});

test("ACTIVE -> COMPLETED with a confirmed payment releases the vehicle to AVAILABLE", async (t) => {
  const booking = bookingDouble({ bookingStatus: "ACTIVE", paymentStatus: "PAID" });
  const { session, vehicleWrites } = stageService(t, booking);

  const result = await updateLifecycleStatus(booking._id ?? "x", "COMPLETED", actor);

  assert.equal(result.bookingStatus, "COMPLETED");
  assert.equal(booking.savedSessions.length, 1);
  assert.equal(session.commits, 1);
  assert.equal(vehicleWrites.length, 1);
  assert.equal(vehicleWrites[0].update.$set.operationalStatus, "AVAILABLE");
  assert.equal(vehicleWrites[0].options.session, session, "vehicle release must join the booking transaction");
});

test("ACTIVE -> COMPLETED is rejected while the payment is still UNPAID", async (t) => {
  const booking = bookingDouble({ bookingStatus: "ACTIVE", paymentStatus: "UNPAID" });
  const { session, vehicleWrites } = stageService(t, booking);

  await assert.rejects(
    updateLifecycleStatus(booking._id ?? "x", "COMPLETED", actor),
    (err) =>
      err.statusCode === 400 && /until its payment is confirmed/.test(err.message),
  );
  assert.equal(vehicleWrites.length, 0, "vehicle must not be released");
  assert.equal(session.commits, 0);
});

test("ACTIVE -> COMPLETED is rejected for a refunded booking", async (t) => {
  const booking = bookingDouble({ bookingStatus: "ACTIVE", paymentStatus: "REFUNDED" });
  stageService(t, booking);

  await assert.rejects(
    updateLifecycleStatus(booking._id ?? "x", "COMPLETED", actor),
    (err) => err.statusCode === 400,
  );
});

test("direct PENDING_PAYMENT -> COMPLETED is rejected even when paid", (t) =>
  expectRejectedTransition(t, "PENDING_PAYMENT", "COMPLETED", "PAID"));

test("direct PENDING_PAYMENT -> ACTIVE is rejected", (t) =>
  expectRejectedTransition(t, "PENDING_PAYMENT", "ACTIVE", "PAID"));

test("CONFIRMED -> COMPLETED is rejected (the rental must be picked up first)", (t) =>
  expectRejectedTransition(t, "CONFIRMED", "COMPLETED", "PAID"));

test("PENDING_PAYMENT -> CONFIRMED requires a confirmed payment", async (t) => {
  const unpaid = bookingDouble({ bookingStatus: "PENDING_PAYMENT", paymentStatus: "UNPAID" });
  const unpaidHarness = stageService(t, unpaid);
  await assert.rejects(
    updateLifecycleStatus("x", "CONFIRMED", actor),
    (err) => err.statusCode === 400 && /until its payment is confirmed/.test(err.message),
  );
  assert.equal(unpaidHarness.session.commits, 0, "no write may commit without payment");

  const paid = bookingDouble({ bookingStatus: "PENDING_PAYMENT", paymentStatus: "PAID" });
  const paidHarness = stageService(t, paid);
  const result = await updateLifecycleStatus("x", "CONFIRMED", actor);
  assert.equal(result.bookingStatus, "CONFIRMED");
  assert.equal(paidHarness.session.commits, 1);
});

test("PENDING_PAYMENT -> PAID is allowed once the payment is confirmed", async (t) => {
  const booking = bookingDouble({ bookingStatus: "PENDING_PAYMENT", paymentStatus: "PAID" });
  const { session } = stageService(t, booking);

  const result = await updateLifecycleStatus("x", "PAID", actor);
  assert.equal(result.bookingStatus, "PAID");
  assert.equal(session.commits, 1);
});

test("happy path PAID -> CONFIRMED -> ACTIVE -> COMPLETED completes the full lifecycle", async (t) => {
  const booking = bookingDouble({ bookingStatus: "PAID", paymentStatus: "PAID" });
  stageService(t, booking);

  await updateLifecycleStatus("x", "CONFIRMED", actor);
  assert.equal(booking.bookingStatus, "CONFIRMED");

  await updateLifecycleStatus("x", "ACTIVE", actor);
  assert.equal(booking.bookingStatus, "ACTIVE");

  await updateLifecycleStatus("x", "COMPLETED", actor);
  assert.equal(booking.bookingStatus, "COMPLETED");
});

test("CANCELLED releases the vehicle to AVAILABLE and records cancellation metadata", async (t) => {
  const booking = bookingDouble({ bookingStatus: "CONFIRMED", paymentStatus: "PAID" });
  const { session, vehicleWrites } = stageService(t, booking);

  const result = await updateLifecycleStatus("x", "CANCELLED", actor);

  assert.equal(result.bookingStatus, "CANCELLED");
  assert.equal(booking.cancelledBy, actor.id);
  assert.ok(booking.cancelledAt instanceof Date);
  assert.equal(booking.cancellationReason, "Booking cancelled by operator");
  assert.equal(session.commits, 1);
  assert.equal(vehicleWrites.length, 1);
  assert.equal(vehicleWrites[0].update.$set.operationalStatus, "AVAILABLE");
});

test("CANCELLED never overrides an open maintenance lock", async (t) => {
  const booking = bookingDouble({ bookingStatus: "CONFIRMED", paymentStatus: "PAID" });
  const { session, vehicleWrites, counts } = stageService(t, booking, {
    openMaintenance: true,
  });

  const result = await updateLifecycleStatus("x", "CANCELLED", actor);

  assert.equal(result.bookingStatus, "CANCELLED");
  assert.equal(counts.maintenanceChecks, 1);
  assert.equal(vehicleWrites.length, 0, "maintenance lock must survive the cancellation");
  assert.equal(session.commits, 1);
});

test("terminal states are immutable", async (t) => {
  for (const from of ["COMPLETED", "CANCELLED", "EXPIRED"]) {
    for (const target of ["PENDING_PAYMENT", "PAID", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED", "EXPIRED"]) {
      await expectRejectedTransition(t, from, target);
    }
  }
});

test("unknown target status is rejected with a clear message", async (t) => {
  const booking = bookingDouble({ bookingStatus: "CONFIRMED", paymentStatus: "PAID" });
  stageService(t, booking);

  await assert.rejects(
    updateLifecycleStatus("x", "PURGATORY", actor),
    (err) => err.statusCode === 400 && /Invalid booking status/.test(err.message),
  );
});

test("re-transitioning to the current status is rejected", async (t) => {
  const booking = bookingDouble({ bookingStatus: "CONFIRMED", paymentStatus: "PAID" });
  stageService(t, booking);

  await assert.rejects(
    updateLifecycleStatus("x", "CONFIRMED", actor),
    (err) => err.statusCode === 400 && /already CONFIRMED/.test(err.message),
  );
});