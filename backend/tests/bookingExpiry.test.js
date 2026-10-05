import test from "node:test";
import assert from "node:assert/strict";
import { expireStalePendingBookings } from "../services/bookingExpiry.service.js";

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000);

// Stands in for the Booking model: applies the reaper filter to an in-memory
// list so query and update shapes are verified without a database.
const createBookingsStub = (initial = []) => {
  const calls = [];
  const rows = [...initial];

  return {
    calls,
    rows,
    updateMany: async (query, update) => {
      calls.push({ query, update });
      const matched = rows.filter(
        (row) =>
          row.bookingStatus === query.bookingStatus &&
          row.paymentStatus === query.paymentStatus &&
          row.createdAt.getTime() < query.createdAt.$lt.getTime(),
      );
      for (const row of matched) row.bookingStatus = update.$set.bookingStatus;
      return { modifiedCount: matched.length };
    },
  };
};

const createSettingsStub = (value) => ({
  findOne: () => ({
    select: () => ({
      lean: async () => {
        if (value instanceof Error) throw value;
        return value;
      },
    }),
  }),
});

const pendingBooking = (ageMinutes) => ({
  bookingStatus: "PENDING_PAYMENT",
  paymentStatus: "UNPAID",
  createdAt: minutesAgo(ageMinutes),
});

const withEnv = async (value, fn) => {
  const original = process.env.RESERVATION_EXPIRY_MINUTES;
  if (value === undefined) delete process.env.RESERVATION_EXPIRY_MINUTES;
  else process.env.RESERVATION_EXPIRY_MINUTES = value;
  try {
    return await fn();
  } finally {
    if (original === undefined) delete process.env.RESERVATION_EXPIRY_MINUTES;
    else process.env.RESERVATION_EXPIRY_MINUTES = original;
  }
};

test("reaper expires a stale PENDING_PAYMENT booking to EXPIRED", async () => {
  const bookings = createBookingsStub([pendingBooking(45)]);

  const expired = await withEnv("30", () =>
    expireStalePendingBookings({
      bookings,
      platformSettings: createSettingsStub(null),
    }),
  );

  assert.equal(expired, 1);
  assert.equal(bookings.calls.length, 1);
  assert.equal(bookings.calls[0].query.bookingStatus, "PENDING_PAYMENT");
  assert.equal(bookings.calls[0].query.paymentStatus, "UNPAID");
  assert.equal(bookings.calls[0].update.$set.bookingStatus, "EXPIRED");
  assert.equal(bookings.rows[0].bookingStatus, "EXPIRED");
});

test("reaper leaves a recent PENDING_PAYMENT booking alone", async () => {
  const bookings = createBookingsStub([pendingBooking(5)]);

  const expired = await withEnv("30", () =>
    expireStalePendingBookings({
      bookings,
      platformSettings: createSettingsStub(null),
    }),
  );

  assert.equal(expired, 0);
  assert.equal(bookings.rows[0].bookingStatus, "PENDING_PAYMENT");
});

test("reaper does not touch bookings that already left PENDING_PAYMENT", async () => {
  const bookings = createBookingsStub([
    { ...pendingBooking(90), bookingStatus: "CONFIRMED" },
    { ...pendingBooking(90), bookingStatus: "CANCELLED" },
  ]);

  const expired = await withEnv("30", () =>
    expireStalePendingBookings({
      bookings,
      platformSettings: createSettingsStub(null),
    }),
  );

  assert.equal(expired, 0);
  assert.equal(bookings.calls[0].query.bookingStatus, "PENDING_PAYMENT");
});

test("reaper skips a stale booking that is already being paid", async () => {
  const bookings = createBookingsStub([
    { ...pendingBooking(90), paymentStatus: "PAID" },
  ]);

  const expired = await withEnv("30", () =>
    expireStalePendingBookings({
      bookings,
      platformSettings: createSettingsStub(null),
    }),
  );

  assert.equal(expired, 0);
  assert.equal(bookings.calls[0].query.paymentStatus, "UNPAID");
});

test("reaper honours the admin-configured reservationExpiryMinutes", async () => {
  const bookings = createBookingsStub([pendingBooking(45)]);

  // 60 min configured: a 45 minute old booking is still inside the window.
  const expired = await withEnv(undefined, () =>
    expireStalePendingBookings({
      bookings,
      platformSettings: createSettingsStub({
        booking: { reservationExpiryMinutes: 60 },
      }),
    }),
  );

  assert.equal(expired, 0);
});

test("reaper clamps a configured window below the minimum", async () => {
  const bookings = createBookingsStub([pendingBooking(20)]);

  // 1 min configured clamps up to the 10 min floor, so 20 min is expired.
  const expired = await withEnv(undefined, () =>
    expireStalePendingBookings({
      bookings,
      platformSettings: createSettingsStub({
        booking: { reservationExpiryMinutes: 1 },
      }),
    }),
  );

  assert.equal(expired, 1);
});

test("reaper falls back to the default window when the value is not a number", async () => {
  const bookings = createBookingsStub([pendingBooking(45)]);

  const expired = await withEnv("not-a-number", () =>
    expireStalePendingBookings({
      bookings,
      platformSettings: createSettingsStub(null),
    }),
  );

  // Default is 30 min, so a 45 minute old booking is expired.
  assert.equal(expired, 1);
});

test("reaper still expires when the settings read fails", async () => {
  const bookings = createBookingsStub([pendingBooking(45)]);

  const expired = await withEnv(undefined, () =>
    expireStalePendingBookings({
      bookings,
      platformSettings: createSettingsStub(new Error("mongo unavailable")),
    }),
  );

  assert.equal(expired, 1);
});
