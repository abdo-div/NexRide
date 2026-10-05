import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBookingCollisionQuery } from "../controllers/bookingController.js";

const requestedVehicleId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const otherVehicleId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const requestedStart = new Date("2026-10-10T10:00:00.000Z");
const requestedEnd = new Date("2026-10-15T10:00:00.000Z");

const collisionQuery = () =>
  buildBookingCollisionQuery(
    requestedVehicleId,
    requestedStart,
    requestedEnd,
  );

const matchesCollisionQuery = (query, booking) => {
  const overlap = query.$or.some((condition) =>
    booking.startDate < condition.startDate.$lt &&
    booking.endDate > condition.endDate.$gt,
  );

  return (
    booking.vehicleId === query.vehicleId &&
    query.bookingStatus.$in.includes(booking.bookingStatus) &&
    overlap
  );
};

const existingBooking = (overrides = {}) => ({
  vehicleId: requestedVehicleId,
  bookingStatus: "CONFIRMED",
  startDate: new Date("2026-10-11T10:00:00.000Z"),
  endDate: new Date("2026-10-12T10:00:00.000Z"),
  ...overrides,
});

test("same vehicle with overlapping dates collides", () => {
  assert.equal(matchesCollisionQuery(collisionQuery(), existingBooking()), true);
});

test("identical and containing date ranges collide", () => {
  const query = collisionQuery();
  assert.equal(
    matchesCollisionQuery(
      query,
      existingBooking({ startDate: requestedStart, endDate: requestedEnd }),
    ),
    true,
  );
  assert.equal(
    matchesCollisionQuery(
      query,
      existingBooking({
        startDate: new Date("2026-10-09T10:00:00.000Z"),
        endDate: new Date("2026-10-16T10:00:00.000Z"),
      }),
    ),
    true,
  );
});

test("same vehicle with partial overlap collides", () => {
  assert.equal(
    matchesCollisionQuery(
      collisionQuery(),
      existingBooking({
        startDate: new Date("2026-10-14T10:00:00.000Z"),
        endDate: new Date("2026-10-18T10:00:00.000Z"),
      }),
    ),
    true,
  );
});

test("same vehicle with non-overlapping dates is allowed", () => {
  assert.equal(
    matchesCollisionQuery(
      collisionQuery(),
      existingBooking({
        startDate: new Date("2026-10-05T10:00:00.000Z"),
        endDate: requestedStart,
      }),
    ),
    false,
  );
});

test("different vehicle with overlapping dates is allowed", () => {
  assert.equal(
    matchesCollisionQuery(
      collisionQuery(),
      existingBooking({ vehicleId: otherVehicleId }),
    ),
    false,
  );
});

test("query filters the persisted vehicleId field and only includes date-blocking statuses", () => {
  const query = collisionQuery();
  assert.equal(query.vehicleId, requestedVehicleId);
  assert.equal(Object.hasOwn(query, "vehicle"), false);
  assert.deepEqual(query.bookingStatus.$in, [
    "PENDING_PAYMENT",
    "PAID",
    "CONFIRMED",
    "ACTIVE",
  ]);

  for (const bookingStatus of ["CANCELLED", "EXPIRED", "COMPLETED"]) {
    assert.equal(
      matchesCollisionQuery(query, existingBooking({ bookingStatus })),
      false,
    );
  }
});

// P0-1 regression: the reservation row is written before the customer reaches
// the payment gateway, so it holds the dates. Omitting PENDING_PAYMENT here is
// what allowed two customers to book the same vehicle for the same dates.
test("PENDING_PAYMENT booking blocks an overlapping booking", () => {
  assert.equal(
    matchesCollisionQuery(
      collisionQuery(),
      existingBooking({ bookingStatus: "PENDING_PAYMENT" }),
    ),
    true,
  );
});

// The other half of the fix: an abandoned checkout must not block the vehicle
// forever. The reaper flips these to EXPIRED, and EXPIRED must not collide.
test("EXPIRED booking does not block a new booking", () => {
  assert.equal(
    matchesCollisionQuery(
      collisionQuery(),
      existingBooking({ bookingStatus: "EXPIRED" }),
    ),
    false,
  );
});