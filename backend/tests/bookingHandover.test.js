import assert from "node:assert/strict";
import { test } from "node:test";
import Booking from "../models/booking_model.js";
import AppError from "../utils/appError.js";
import { saveCustomerHandover } from "../services/bookingService.js";
import { customerHandoverSchema } from "../validations/booking.validation.js";

const bookingId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const customerId = "bbbbbbbbbbbbbbbbbbbbbbbb";

const bookingFixture = (status) => ({
  _id: bookingId,
  customerId,
  bookingStatus: status,
  handover: { pickup: {}, return: {} },
  saveCalls: [],
  async save(options) { this.saveCalls.push(options); return this; },
});

test("Task 6: pickup acknowledgement is stored without changing booking lifecycle", async (t) => {
  const booking = bookingFixture("CONFIRMED");
  let filter;
  t.mock.method(Booking, "findOne", async (value) => { filter = value; return booking; });

  const result = await saveCustomerHandover(bookingId, customerId, {
    stage: "PICKUP",
    licenceReady: true,
    identityReady: true,
    vehicleInspected: true,
    fuelRecorded: true,
    notes: "Small existing scratch documented",
  });

  assert.deepEqual(filter, { _id: bookingId, customerId });
  assert.equal(result.bookingStatus, "CONFIRMED");
  assert.equal(result.handover.pickup.vehicleInspected, true);
  assert.equal(result.handover.pickup.notes, "Small existing scratch documented");
  assert.ok(result.handover.pickup.customerConfirmedAt instanceof Date);
  assert.deepEqual(result.saveCalls[0], { validateBeforeSave: false });
});

test("Task 6: active-rental return declaration preserves fuel, odometer and damage report", async (t) => {
  const booking = bookingFixture("ACTIVE");
  t.mock.method(Booking, "findOne", async () => booking);

  const result = await saveCustomerHandover(bookingId, customerId, {
    stage: "RETURN",
    personalItemsRemoved: true,
    fuelRestored: false,
    damageReported: true,
    fuelLevel: "HALF",
    odometer: 55231,
    notes: "Stone chip on windscreen",
  });

  assert.equal(result.bookingStatus, "ACTIVE");
  assert.equal(result.handover.return.fuelLevel, "HALF");
  assert.equal(result.handover.return.odometer, 55231);
  assert.equal(result.handover.return.damageReported, true);
  assert.ok(result.handover.return.customerSubmittedAt instanceof Date);
});

test("Task 6: declarations reject the wrong lifecycle and another customer's booking", async (t) => {
  t.mock.method(Booking, "findOne", async () => bookingFixture("PAID"));
  await assert.rejects(
    saveCustomerHandover(bookingId, customerId, { stage: "PICKUP" }),
    (error) => error instanceof AppError && error.statusCode === 409,
  );

  t.mock.restoreAll();
  t.mock.method(Booking, "findOne", async () => null);
  await assert.rejects(
    saveCustomerHandover(bookingId, customerId, { stage: "RETURN" }),
    (error) => error instanceof AppError && error.statusCode === 404,
  );
});

test("Task 6: handover validation requires every pickup acknowledgement", () => {
  const incomplete = customerHandoverSchema.safeParse({
    params: { id: bookingId, stage: "pickup" },
    body: {
      stage: "PICKUP",
      licenceReady: true,
      identityReady: true,
      vehicleInspected: false,
      fuelRecorded: true,
    },
  });
  assert.equal(incomplete.success, false);

  const valid = customerHandoverSchema.safeParse({
    params: { id: bookingId, stage: "return" },
    body: {
      stage: "RETURN",
      personalItemsRemoved: true,
      fuelRestored: false,
      damageReported: true,
      fuelLevel: "half",
      odometer: 20000,
      notes: "Scratch on rear bumper",
    },
  });
  assert.equal(valid.success, true);
  assert.equal(valid.data.body.fuelLevel, "HALF");
});
