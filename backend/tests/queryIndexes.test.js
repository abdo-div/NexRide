import assert from "node:assert/strict";
import { test } from "node:test";

import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import Vehicle from "../models/vehicle_model.js";
import { fetchCustomerBookings } from "../services/bookingService.js";

const hasIndex = (model, expected) =>
  model.schema.indexes().some(([fields]) =>
    Object.entries(expected).every(([key, direction]) => fields[key] === direction),
  );

test("availability and tenant calendar queries have equality-first compound indexes", () => {
  assert.equal(
    hasIndex(Booking, {
      vehicleId: 1,
      bookingStatus: 1,
      startDate: 1,
      endDate: 1,
    }),
    true,
  );
  assert.equal(
    hasIndex(Booking, {
      companyId: 1,
      bookingStatus: 1,
      startDate: 1,
      endDate: 1,
    }),
    true,
  );
});

test("payment ledger and payout batch filters have matching compound indexes", () => {
  assert.equal(
    hasIndex(Payment, {
      companyId: 1,
      status: 1,
      paidAt: -1,
      createdAt: -1,
    }),
    true,
  );
  assert.equal(
    hasIndex(Payment, {
      status: 1,
      payoutStatus: 1,
      paymentMethod: 1,
      companyId: 1,
    }),
    true,
  );
  assert.equal(
    hasIndex(Payment, {
      companyId: 1,
      status: 1,
      payoutStatus: 1,
      paymentMethod: 1,
    }),
    true,
  );
});

test("public and tenant fleet newest-first queries include the soft-delete predicate", () => {
  assert.equal(
    hasIndex(Vehicle, { companyId: 1, deletedAt: 1, createdAt: -1 }),
    true,
  );
  assert.equal(
    hasIndex(Vehicle, {
      listingStatus: 1,
      operationalStatus: 1,
      deletedAt: 1,
      createdAt: -1,
    }),
    true,
  );
});

test("customer booking history uses its newest-first compound index", async (t) => {
  let filter;
  let sort;
  const query = {
    sort(value) {
      sort = value;
      return Promise.resolve([]);
    },
  };
  t.mock.method(Booking, "find", (value) => {
    filter = value;
    return query;
  });

  await fetchCustomerBookings("customer-id");

  assert.deepEqual(filter, { customerId: "customer-id" });
  assert.deepEqual(sort, { createdAt: -1 });
  assert.equal(hasIndex(Booking, { customerId: 1, createdAt: -1 }), true);
});
