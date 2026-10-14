import assert from "node:assert/strict";
import { test } from "node:test";
import { checkoutFingerprint } from "../utils/checkoutIdentity.js";
import Booking from "../models/booking_model.js";

const body = { vehicleId: "a".repeat(24), startDate: "2099-01-01T12:00:00Z", endDate: "2099-01-02T12:00:00Z", addonIds: ["insurance", "driver"], primaryDriver: { firstName: "QA", lastName: "Driver", email: "qa@example.com", phone: "+218910000001", eligibilityConfirmed: true } };
test("equivalent date instants and reordered extras have the same checkout identity", () => {
  assert.equal(checkoutFingerprint(body), checkoutFingerprint({ ...body, startDate: "2099-01-01T14:00:00+02:00", addonIds: ["driver", "insurance", "driver"] }));
});
test("a checkout key cannot silently change the reservation or driver", () => {
  for (const changes of [{ endDate: "2099-01-03T12:00:00Z" }, { paymentMethod: "CASH_ON_DELIVERY" }, { primaryDriver: { ...body.primaryDriver, email: "other@example.com" } }, { addonIds: [] }]) {
    assert.notEqual(checkoutFingerprint(body), checkoutFingerprint({ ...body, ...changes }));
  }
});
test("checkout uniqueness is scoped to the customer and excludes legacy bookings", () => {
  const index = Booking.schema.indexes().find(([fields]) => fields.checkoutKey === 1);
  assert.deepEqual(index[0], { customerId: 1, checkoutKey: 1 });
  assert.equal(index[1].unique, true);
  assert.deepEqual(index[1].partialFilterExpression, { checkoutKey: { $type: "string" } });
});
