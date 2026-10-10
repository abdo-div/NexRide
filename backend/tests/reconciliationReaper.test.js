import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Payment from "../models/payment_model.js";
import Booking from "../models/booking_model.js";
import { markCashPaymentCompleted } from "../services/paymentService.js";
import { expireStalePendingBookings } from "../services/bookingExpiry.service.js";

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000);

// ---------------------------------------------------------------------------
// Reaper sweep harness: injectable models record every write so the sweep's
// reconciliation can be asserted without a database.
// ---------------------------------------------------------------------------

const staleBooking = (overrides = {}) => ({
  _id: "111111111111111111111111",
  vehicleId: "222222222222222222222222",
  bookingStatus: "PENDING_PAYMENT",
  paymentStatus: "UNPAID",
  createdAt: minutesAgo(45),
  saves: [],
  async save({ session, validateBeforeSave } = {}) {
    this.saves.push({ session, validateBeforeSave });
    return this;
  },
  ...overrides,
});

const runReaperSweep = ({ rows, openMaintenance = false } = {}) => {
  const sessions = [];
  const paymentWrites = [];
  const vehicleWrites = [];
  const releasedHolds = [];
  const bookmarks = { rows };

  const makeSession = () => {
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
    sessions.push(session);
    return session;
  };

  const bookingsStub = {
    find: async (query) =>
      rows.filter(
        (row) =>
          row.bookingStatus === query.bookingStatus &&
          row.paymentStatus === query.paymentStatus &&
          row.createdAt.getTime() < query.createdAt.$lt.getTime(),
      ),
    findById: (id) => ({
      session: async () =>
        rows.find((row) => String(row._id) === String(id)),
    }),
  };

  const call = () =>
    expireStalePendingBookings({
      now: new Date(),
      bookings: bookingsStub,
      platformSettings: {
        findOne: () => ({ select: () => ({ lean: async () => null }) }),
      },
      payments: {
        updateMany: async (filter, update, options) => {
          paymentWrites.push({ filter, update, options });
          return { modifiedCount: 1 };
        },
      },
      vehicles: {
        updateOne: async (filter, update, options) => {
          vehicleWrites.push({ filter, update, options });
          return { modifiedCount: 1 };
        },
      },
      maintenanceEvents: {
        exists: () => ({
          session: async () =>
            openMaintenance ? { _id: "333333333333333333333333" } : null,
        }),
      },
      releaseHold: async (vehicleId) => {
        releasedHolds.push(vehicleId);
      },
      startSession: async () => makeSession(),
    });

  return { call, sessions, paymentWrites, vehicleWrites, releasedHolds, bookmarks };
};

test("Test 1: reaper sweeps >30-min PENDING_PAYMENT bookings, expires the booking and its PENDING payment, and releases the vehicle", async () => {
  const row = staleBooking();
  const { call, sessions, paymentWrites, vehicleWrites, releasedHolds } =
    runReaperSweep({ rows: [row] });

  const expired = await call();

  assert.equal(expired, 1);
  assert.equal(row.bookingStatus, "EXPIRED");
  assert.equal(row.saves.length, 1, "the booking flip must go through a transaction save");

  assert.equal(paymentWrites.length, 1);
  assert.deepEqual(paymentWrites[0].filter, {
    bookingId: row._id,
    status: "PENDING",
  });
  assert.equal(paymentWrites[0].update.$set.status, "EXPIRED");
  assert.equal(paymentWrites[0].options.session, sessions[0]);

  assert.equal(vehicleWrites.length, 1);
  assert.deepEqual(vehicleWrites[0].filter, { _id: row.vehicleId });
  assert.equal(vehicleWrites[0].update.$set.operationalStatus, "AVAILABLE");
  assert.equal(vehicleWrites[0].options.session, sessions[0]);

  assert.deepEqual(releasedHolds, [row.vehicleId], "the checkout hold survives until after commit");
  assert.equal(sessions[0].committed, true);
  assert.equal(sessions[0].aborted, false);
});

test("Test 2: reaper does not override an active maintenance lock while still reconciling the ledger", async () => {
  const row = staleBooking();
  const { call, sessions, paymentWrites, vehicleWrites, releasedHolds } =
    runReaperSweep({ rows: [row], openMaintenance: true });

  const expired = await call();

  assert.equal(expired, 1);
  assert.equal(row.bookingStatus, "EXPIRED");
  assert.equal(paymentWrites.length, 1, "the stale PENDING payment is still retired");
  assert.equal(paymentWrites[0].update.$set.status, "EXPIRED");
  assert.equal(vehicleWrites.length, 0, "a maintenance quarantine must never be unset by a sweep");
  assert.deepEqual(releasedHolds, [row.vehicleId]);
  assert.equal(sessions[0].committed, true);
});

test("Test 3: cash collection marks the payment collected and advances the booking through the allowed lifecycle", async (t) => {
  const paymentId = "444444444444444444444444";
  const bookingId = "555555555555555555555555";
  const companyId = "666666666666666666666666";
  const actorId = "777777777777777777777777";

  const payment = {
    _id: paymentId,
    bookingId,
    customerId: "888888888888888888888888",
    companyId,
    amount: 300,
    paymentMethod: "CASH_ON_DELIVERY",
    status: "PENDING",
    payoutStatus: "UNSETTLED",
  };
  const booking = {
    _id: bookingId,
    bookingStatus: "PENDING_PAYMENT",
    paymentStatus: "UNPAID",
  };
  const actor = { _id: actorId, id: actorId, role: "company", company: companyId };

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

  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(Payment, "findById", () => ({
    session: async () => payment,
  }));
  t.mock.method(Booking, "findById", () => ({
    session: async () => booking,
  }));
  const updates = [];
  t.mock.method(Payment, "findOneAndUpdate", async (filter, update, options) => {
    updates.push({ filter, update, options });
    return { ...payment, ...(update.$set || {}) };
  });
  booking.save = async (options) => {
    booking.savedWith = options;
    return booking;
  };

  const result = await markCashPaymentCompleted({
    paymentId,
    actorUser: actor,
    tenantId: companyId,
  });

  assert.equal(result.payment.status, "COMPLETED");
  assert.equal(result.payment.collectedBy, actorId);
  assert.ok(result.payment.collectedAt instanceof Date, "collectedAt must be stamped");
  assert.ok(result.payment.paidAt instanceof Date, "paidAt must be stamped");
  assert.deepEqual(updates[0].filter, { _id: paymentId, status: "PENDING" }, "guard: PENDING only");

  assert.equal(booking.paymentStatus, "PAID");
  assert.equal(
    booking.bookingStatus,
    "CONFIRMED",
    "cash collection advances PENDING_PAYMENT -> CONFIRMED as the matrix allows",
  );
  assert.equal(booking.savedWith.session, session);
  assert.equal(booking.savedWith.validateBeforeSave, false);
  assert.equal(session.committed, true);
  assert.equal(session.aborted, false);
});