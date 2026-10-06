import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import Vehicle from "../models/vehicle_model.js";
import MaintenanceEvent from "../models/Maintenance_model.js";
import AppError from "../utils/appError.js";
import * as maintenanceService from "../services/maintenanceService.js";
import {
  cancelBookingById,
  checkAvailability,
  computeRefundFraction,
  REFUND_POLICY,
} from "../services/bookingService.js";
import { buildPayoutSummary } from "../services/payoutService.js";

const userId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const vehicleId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const companyId = "cccccccccccccccccccccccc";
const bookingId = "dddddddddddddddddddddddd";
const paymentId = "eeeeeeeeeeeeeeeeeeeeeeee";

const makeVehicle = (overrides = {}) => ({
  _id: vehicleId,
  companyId,
  operationalStatus: "AVAILABLE",
  async save() {},
  ...overrides,
});

const makeEvent = (overrides = {}) => ({
  _id: "ffffffffffffffffffffffff",
  id: "ffffffffffffffffffffffff",
  vehicleId,
  companyId,
  status: "SCHEDULED",
  completedDate: null,
  estReturnDate: null,
  async save() {},
  toObject() {
    return { ...this };
  },
  ...overrides,
});

const populatedEventQuery = (event) => ({
  populate() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve({
      ...event,
      toObject: () => ({ ...event }),
    }).then(resolve, reject);
  },
});

// ---------------------------------------------------------------------------
// P1-2a refund policy math
// ---------------------------------------------------------------------------

test("P1-2a: refund fraction follows the 48h / 24h cancellation policy", () => {
  const now = new Date("2026-11-01T10:00:00.000Z");
  const in48h = new Date(now.getTime() + 48 * 3600e3);
  const in30h = new Date(now.getTime() + 30 * 3600e3);
  const in24h = new Date(now.getTime() + 24 * 3600e3);
  const in23h = new Date(now.getTime() + 23 * 3600e3);
  const atPickup = new Date(now.getTime());

  assert.equal(REFUND_POLICY.fullRefundHours, 48);
  assert.equal(REFUND_POLICY.partialRefundHours, 24);
  assert.equal(computeRefundFraction(in48h, now), 1);
  assert.equal(computeRefundFraction(in30h, now), 0.5);
  assert.equal(computeRefundFraction(in24h, now), 0.5);
  assert.equal(computeRefundFraction(in23h, now), 0);
  assert.equal(computeRefundFraction(atPickup, now), 0);
});

// ---------------------------------------------------------------------------
// P1-2a cancellation refunds
// ---------------------------------------------------------------------------

const setupCancel = async (t, { booking, paidPayment }) => {
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
  const captures = {
    sessionStarts: 0,
    saves: [],
    updates: [],
    failedPaymentCalls: [],
    restoreCalls: [],
    restored: false,
  };

  t.mock.method(mongoose, "startSession", async () => {
    captures.sessionStarts += 1;
    return session;
  });
  t.mock.method(Booking, "findById", async () => booking);
  t.mock.method(Payment, "findOne", () => ({
    sort: () => ({
      session: async () => (paidPayment === undefined ? null : paidPayment),
    }),
  }));
  t.mock.method(Payment, "findOneAndUpdate", async (filter, update, options) => {
    captures.updates.push({ filter, update, options });
    return { ...(paidPayment || {}), ...(update.$set || {}) };
  });
  t.mock.method(Payment, "updateMany", async (filter, update) => {
    captures.failedPaymentCalls.push({ filter, update });
    return { modifiedCount: 1 };
  });
  t.mock.method(MaintenanceEvent, "exists", () => ({
    session: async () =>
      captures.openMaintenance ? { _id: "gggggggggggggggggggggggg" } : null,
  }));
  t.mock.method(Vehicle, "findByIdAndUpdate", async (id, update, options) => {
    captures.restored = true;
    captures.restoreCalls.push({ id, update, options });
    return makeVehicle();
  });

  if (booking) {
    booking.save = async (options) => {
      captures.saves.push(options);
      return booking;
    };
  }

  return { session, captures };
};

const makePaidBooking = (startDate, overrides = {}) => ({
  _id: bookingId,
  bookingStatus: "CONFIRMED",
  paymentStatus: "PAID",
  startDate,
  vehicleId,
  customerId: "999999999999999999999999",
  ...overrides,
});

const makePaidPayment = (overrides = {}) => ({
  _id: paymentId,
  bookingId,
  amount: 300,
  commissionAmount: 24,
  companyShare: 276,
  status: "COMPLETED",
  payoutStatus: "UNSETTLED",
  ...overrides,
});

test("P1-2a: cancelling far ahead of pickup refunds 100% and marks the payment REFUNDED", async (t) => {
  const booking = makePaidBooking(new Date(Date.now() + 72 * 3600e3));
  const paidPayment = makePaidPayment();
  const { session, captures } = await setupCancel(t, { booking, paidPayment });

  const result = await cancelBookingById(bookingId, { id: userId }, { reason: "changed my mind" });

  assert.equal(booking.bookingStatus, "CANCELLED");
  assert.equal(booking.paymentStatus, "REFUNDED");
  assert.equal(booking.cancelledBy, userId);
  assert.equal(booking.cancellationReason, "changed my mind");
  assert.equal(captures.updates.length, 1);
  assert.deepEqual(captures.updates[0].filter, { _id: paymentId, status: "COMPLETED" });
  assert.equal(captures.updates[0].update.$set.status, "REFUNDED");
  assert.equal(captures.updates[0].update.$set.refundAmount, 300);
  assert.equal(captures.updates[0].update.$set.refundedBy, userId);
  assert.equal(captures.updates[0].options.session, session);
  assert.equal(captures.saves.length, 1);
  assert.equal(captures.saves[0].session, session);
  assert.equal(captures.saves[0].validateBeforeSave, false);
  assert.equal(captures.restored, true, "vehicle returns to market when not quarantined");
  assert.equal(session.committed, true);
  assert.equal(session.aborted, false);
  assert.equal(result.bookingStatus, "CANCELLED");
});

test("P1-2a: cancelling 30h before pickup refunds 50% and marks the payment PARTIALLY_REFUNDED", async (t) => {
  const booking = makePaidBooking(new Date(Date.now() + 30 * 3600e3));
  const paidPayment = makePaidPayment();
  const { session, captures } = await setupCancel(t, { booking, paidPayment });

  await cancelBookingById(bookingId, { id: userId });

  assert.equal(booking.paymentStatus, "PARTIALLY_REFUNDED");
  assert.equal(captures.updates.length, 1);
  assert.equal(captures.updates[0].update.$set.status, "PARTIALLY_REFUNDED");
  assert.equal(captures.updates[0].update.$set.refundAmount, 150);
  assert.equal(session.committed, true);
});

test("P1-2a: cancelling less than 24h before pickup keeps the full COMPLETED payment and booking stays PAID", async (t) => {
  const booking = makePaidBooking(new Date(Date.now() + 6 * 3600e3));
  const paidPayment = makePaidPayment();
  const { session, captures } = await setupCancel(t, { booking, paidPayment });

  await cancelBookingById(bookingId, { id: userId });

  assert.equal(booking.bookingStatus, "CANCELLED");
  assert.equal(booking.paymentStatus, "PAID", "no refund due means the payment stays completed");
  assert.equal(captures.updates.length, 0, "completed payment is never rewritten when no refund applies");
  assert.equal(captures.failedPaymentCalls.length, 0);
  assert.equal(session.committed, true);
});

test("P1-2a: cancelling a never-paid pending booking retires its PENDING ledger row and marks unpaid", async (t) => {
  const booking = makePaidBooking(new Date(Date.now() + 72 * 3600e3), {
    paymentStatus: "UNPAID",
  });
  const { session, captures } = await setupCancel(t, { booking, paidPayment: null });

  await cancelBookingById(bookingId, { id: userId });

  assert.equal(booking.paymentStatus, "UNPAID");
  assert.equal(captures.updates.length, 0);
  assert.equal(captures.failedPaymentCalls.length, 1);
  assert.deepEqual(captures.failedPaymentCalls[0].filter, {
    bookingId,
    status: "PENDING",
  });
  assert.equal(captures.failedPaymentCalls[0].update.$set.status, "FAILED");
  assert.equal(session.committed, true);
});

test("P1-2b: a cancelled booking never unlocks a vehicle that is quarantined for maintenance", async (t) => {
  const booking = makePaidBooking(new Date(Date.now() + 72 * 3600e3));
  const paidPayment = makePaidPayment();
  const { session, captures } = await setupCancel(t, { booking, paidPayment });
  captures.openMaintenance = true;

  await cancelBookingById(bookingId, { id: userId });

  assert.equal(booking.bookingStatus, "CANCELLED");
  assert.equal(captures.restored, false, "vehicle must stay locked when an open maintenance event exists");
  assert.equal(captures.restoreCalls.length, 0);
  assert.equal(session.committed, true);
});

test("P1-2a: ACTIVE and COMPLETED bookings cannot be cancelled and start no transaction", async (t) => {
  for (const bookingStatus of ["ACTIVE", "COMPLETED", "CANCELLED"]) {
    const booking = makePaidBooking(new Date(Date.now() + 72 * 3600e3), { bookingStatus });
    const { session, captures } = await setupCancel(t, { booking, paidPayment: null });

    await assert.rejects(
      cancelBookingById(bookingId, { id: userId }),
      (err) => err instanceof AppError && err.statusCode === 400,
    );

    assert.equal(captures.sessionStarts, 0);
    assert.equal(session.committed, false);
    assert.equal(session.aborted, false);
  }
});

test("P1-2a: cancelling a missing booking is a 404 before any transaction", async (t) => {
  const { session, captures } = await setupCancel(t, {
    booking: null,
    paidPayment: null,
  });

  await assert.rejects(
    cancelBookingById(bookingId, { id: userId }),
    (err) => err instanceof AppError && err.statusCode === 404,
  );

  assert.equal(captures.sessionStarts, 0);
  assert.equal(session.committed, false);
});

// ---------------------------------------------------------------------------
// P1-2a payout ledger excludes refunded revenue
// ---------------------------------------------------------------------------

test("P1-2a: payout summary scales kept revenue by refunded portion and never pays out a fully refunded row", async (t) => {
  let aggregatePipeline;
  t.mock.method(Payment, "aggregate", async (pipeline) => {
    aggregatePipeline = pipeline;
    return [
      {
        gross: 450,
        platformTake: 36,
        companyEarnings: 414,
        unsettled: 450,
        processing: 0,
        settled: 0,
        adjustments: 150,
        bookings: 2,
        partners: ["company-1"],
      },
    ];
  });
  t.mock.method(Payment, "countDocuments", async () => 1);

  const summary = await buildPayoutSummary();

  const [matchStage, addFieldsStage, groupStage] = aggregatePipeline;
  assert.deepEqual(matchStage.$match.status.$in, [
    "COMPLETED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
  ]);
  assert.ok(addFieldsStage.$addFields.kept);
  assert.ok(addFieldsStage.$addFields.keptFraction);
  assert.ok(addFieldsStage.$addFields.refundedPortion);
  assert.equal(groupStage.$group.adjustments.$sum, "$refundedPortion");
  assert.equal(groupStage.$group.gross.$sum.$cond[0], "$keepsRevenue");
  assert.equal(summary.adjustments, 150, "refunded portion feeds the adjustments total");
  assert.equal(summary.pendingPayouts, 450);
});

// ---------------------------------------------------------------------------
// P1-2b maintenance lock conflicts
// ---------------------------------------------------------------------------

test("P1-2b: maintenance scheduling is rejected while a paid booking overlaps the window", async (t) => {
  const vehicle = makeVehicle();
  let createCalls = 0;
  t.mock.method(Vehicle, "findById", async () => vehicle);
  t.mock.method(Booking, "find", async () => [
    { _id: bookingId, bookingStatus: "PAID", paymentStatus: "PAID" },
  ]);
  t.mock.method(MaintenanceEvent, "create", async () => {
    createCalls += 1;
    return makeEvent();
  });

  await assert.rejects(
    maintenanceService.createMaintenanceEvent(
      {
        vehicleId,
        category: "ROUTINE_SERVICE",
        triggerReason: "Scheduled service",
        intakeDate: "2026-12-01T08:00:00.000Z",
        estReturnDate: "2026-12-05T08:00:00.000Z",
      },
      userId,
    ),
    (err) => err instanceof AppError && err.statusCode === 409,
  );

  assert.equal(createCalls, 0, "no maintenance event while a hard conflict exists");
  assert.equal(vehicle.operationalStatus, "AVAILABLE");
});

test("P1-2b: unpaid PENDING_PAYMENT bookings are auto-cancelled when maintenance is scheduled", async (t) => {
  const vehicle = makeVehicle();
  const event = makeEvent();
  const pending = {
    _id: bookingId,
    bookingStatus: "PENDING_PAYMENT",
    paymentStatus: "UNPAID",
    startDate: new Date("2026-12-02T08:00:00.000Z"),
    vehicleId,
    customerId: "999999999999999999999999",
    saved: false,
    async save() {
      this.saved = true;
    },
  };
  let createPayload;
  let failedFaithCalls = 0;

  t.mock.method(Vehicle, "findById", async () => vehicle);
  t.mock.method(Booking, "find", async () => [pending]);
  t.mock.method(Payment, "updateMany", async (filter, update) => {
    failedFaithCalls += 1;
    return { modifiedCount: 1 };
  });
  t.mock.method(MaintenanceEvent, "create", async (payload) => {
    createPayload = payload;
    return event;
  });
  t.mock.method(MaintenanceEvent, "findById", () => populatedEventQuery(event));

  const result = await maintenanceService.createMaintenanceEvent(
    {
      vehicleId,
      category: "ROUTINE_SERVICE",
      triggerReason: "Scheduled service",
      intakeDate: "2026-12-01T08:00:00.000Z",
      estReturnDate: "2026-12-05T08:00:00.000Z",
    },
    userId,
  );

  assert.equal(pending.bookingStatus, "CANCELLED");
  assert.equal(pending.paymentStatus, "UNPAID");
  assert.equal(pending.cancelledBy, userId);
  assert.match(pending.cancellationReason, /maintenance/);
  assert.equal(pending.saved, true);
  assert.equal(failedFaithCalls, 1);
  assert.equal(vehicle.operationalStatus, "MAINTENANCE");
  assert.ok(createPayload);
  assert.equal(result.dispatchStatus, "SCHEDULED");
});

test("P1-2b: public availability respects the maintenance lock without consulting bookings", async (t) => {
  let bookingSearches = 0;
  t.mock.method(Vehicle, "findById", () => ({
    select: async () => ({
      listingStatus: "PUBLISHED",
      operationalStatus: "MAINTENANCE",
    }),
  }));
  t.mock.method(Booking, "findOne", () => {
    bookingSearches += 1;
    return { then: () => {} };
  });

  const result = await checkAvailability(
    vehicleId,
    "2026-12-01T08:00:00.000Z",
    "2026-12-05T08:00:00.000Z",
  );

  assert.equal(result.isAvailable, false);
  assert.equal(bookingSearches, 0, "a maintenance-locked vehicle needs no booking scan");
});

test("P1-2b: completing one event keeps the unit locked while another is still open", async (t) => {
  const event = makeEvent({ status: "IN_PROGRESS" });
  const vehicle = makeVehicle({ operationalStatus: "MAINTENANCE" });
  let findByIdCalls = 0;
  t.mock.method(MaintenanceEvent, "findById", () =>
    findByIdCalls++ === 0 ? event : populatedEventQuery(event),
  );
  t.mock.method(Vehicle, "findById", async () => vehicle);
  t.mock.method(MaintenanceEvent, "exists", async () => ({ _id: "hhhhhhhhhhhhhhhhhhhhhhhh" }));

  const result = await maintenanceService.completeMaintenanceEvent(event.id);

  assert.equal(event.status, "COMPLETED");
  assert.equal(vehicle.operationalStatus, "MAINTENANCE", "second open event keeps the lock");
  assert.equal(result.dispatchStatus, "COMPLETED");
});