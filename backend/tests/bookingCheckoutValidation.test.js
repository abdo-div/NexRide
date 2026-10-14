import assert from "node:assert/strict";
import { test } from "node:test";
import { createBookingSchema } from "../validations/booking.validation.js";
import Booking from "../models/booking_model.js";
const start = new Date(Date.now() + 86400000).toISOString();
const end = new Date(Date.now() + 172800000).toISOString();
const driver = { firstName: "QA", lastName: "Driver", email: "qa@example.com", phone: "+218910000001", eligibilityConfirmed: true };
const body = { vehicleId: "a".repeat(24), startDate: start, endDate: end, primaryDriver: driver };
test("new checkout requires driver identity and positive eligibility", () => {
  assert.equal(createBookingSchema.safeParse({ body }).success, true);
  for (const primaryDriver of [undefined, { ...driver, firstName: " " }, { ...driver, email: "bad" }, { ...driver, phone: "123" }, { ...driver, eligibilityConfirmed: false }]) {
    assert.equal(createBookingSchema.safeParse({ body: { ...body, primaryDriver } }).success, false);
  }
});
test("new checkout requires future explicit instants and a positive duration", () => {
  for (const dates of [ { startDate: "2020-01-01T00:00:00Z" }, { startDate: "2099-11-10", endDate: "2099-11-11" }, { endDate: start }, { endDate: new Date(Date.parse(start) - 1000).toISOString() } ]) {
    assert.equal(createBookingSchema.safeParse({ body: { ...body, ...dates } }).success, false);
  }
});
test("driver details are retained by the booking model", () => {
  const booking = new Booking({ primaryDriver: driver, startDate: start, endDate: end });
  assert.deepEqual(booking.primaryDriver.toObject(), driver);
  assert.equal(booking.startDate.toISOString(), start);
});
