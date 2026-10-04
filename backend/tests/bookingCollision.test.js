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

test("query filters the persisted vehicleId field and excludes inactive bookings", () => {
  const query = collisionQuery();
  assert.equal(query.vehicleId, requestedVehicleId);
  assert.equal(Object.hasOwn(query, "vehicle"), false);
  assert.deepEqual(query.bookingStatus.$in, ["PAID", "CONFIRMED", "ACTIVE"]);

  for (const bookingStatus of ["CANCELLED", "EXPIRED", "PENDING_PAYMENT"]) {
    assert.equal(
      matchesCollisionQuery(query, existingBooking({ bookingStatus })),
      false,
    );
  }
});