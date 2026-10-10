import test from "node:test";
import assert from "node:assert/strict";
import { expireStalePendingBookings } from "../services/bookingExpiry.service.js";

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000);

// Stands in for the Booking model: applies the reaper's filter to an in-memory
// list so the query shape and the transactional per-row re-read are verified
// without a database.
const createBookingsStub = (initial = []) => {
  const findCalls = [];
  const rows = [...initial];

  const matchesQuery = (row, query) =>
    row.bookingStatus === query.bookingStatus &&
    row.paymentStatus === query.paymentStatus &&
    row.createdAt.getTime() < query.createdAt.$lt.getTime();

  return {
    findCalls,
    rows,
    find: async (query) => {
      findCalls.push(query);
      return rows.filter((row) => matchesQuery(row, query));
    },
    findById: (id) => ({
      session: async () => rows.find((row) => String(row._id) === String(id)),
    }),
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

const makePaymentStub = () => {
  const paymentWrites = [];
  return {
    paymentWrites,
    updateMany: async (filter, update, options) => {
      paymentWrites.push({ filter, update, options });
      return { modifiedCount: 1 };
    },
  };
};

const makeVehicleStub = () => {
  const vehicleWrites = [];
  return {
    vehicleWrites,
    updateOne: async (filter, update, options) => {
      vehicleWrites.push({ filter, update, options });
      return { modifiedCount: 1 };
    },
  };
};

const pendingBooking = (ageMinutes, overrides = {}) => ({
  _id: "bbbbbbbbbbbbbbbbbbbbbbbb",
  vehicleId: "aaaaaaaaaaaaaaaaaaaaaaaa",
  bookingStatus: "PENDING_PAYMENT",
  paymentStatus: "UNPAID",
  createdAt: minutesAgo(ageMinutes),
  saves: [],
  async save({ session, validateBeforeSave } = {}) {
    this.saves.push({ session, validateBeforeSave });
    return this;
  },
  ...overrides,
});

const runSweep = async ({
  rows,
  settings = null,
  env,
  openMaintenance = false,
} = {}) => {
  const bookings = createBookingsStub(rows);
  const payments = makePaymentStub();
  const vehicles = makeVehicleStub();
  const releasedHolds = [];
  const sessionsStarted = [];
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

  const call = () =>
    expireStalePendingBookings({
      bookings,
      payments,
      vehicles,
      platformSettings: createSettingsStub(settings),
      maintenanceEvents: {
        exists: () => ({
          session: async () => (openMaintenance ? { _id: "cccccccccccccccccccccccc" } : null),
        }),
      },
      releaseHold: async (vehicleId) => {
        releasedHolds.push(vehicleId);
      },
      startSession: async () => {
        sessionsStarted.push(session);
        return session;
      },
    });

  let expired;
  if (env === undefined) {
    const original = process.env.RESERVATION_EXPIRY_MINUTES;
    delete process.env.RESERVATION_EXPIRY_MINUTES;
    try {
      expired = await call();
    } finally {
      if (original !== undefined) process.env.RESERVATION_EXPIRY_MINUTES = original;
    }
  } else {
    const original = process.env.RESERVATION_EXPIRY_MINUTES;
    process.env.RESERVATION_EXPIRY_MINUTES = env;
    try {
      expired = await call();
    } finally {
      if (original === undefined) delete process.env.RESERVATION_EXPIRY_MINUTES;
      else process.env.RESERVATION_EXPIRY_MINUTES = original;
    }
  }

  return {
    expired,
    bookings,
    payments,
    vehicles,
    releasedHolds,
    sessionsStarted,
  };
};

test("reaper expires a stale PENDING_PAYMENT booking and reconciles its payment, vehicle and hold", async () => {
  const { expired, bookings, payments, vehicles, releasedHolds, sessionsStarted } =
    await runSweep({ rows: [pendingBooking(45)] });

  assert.equal(expired, 1);
  assert.equal(bookings.findCalls.length, 1);
  assert.equal(bookings.findCalls[0].bookingStatus, "PENDING_PAYMENT");
  assert.equal(bookings.findCalls[0].paymentStatus, "UNPAID");
  assert.ok(bookings.findCalls[0].createdAt.$lt instanceof Date);
  assert.equal(bookings.rows[0].bookingStatus, "EXPIRED");
  assert.equal(payments.paymentWrites.length, 1);
  assert.deepEqual(payments.paymentWrites[0].filter, {
    bookingId: bookings.rows[0]._id,
    status: "PENDING",
  });
  assert.equal(payments.paymentWrites[0].update.$set.status, "EXPIRED");
  assert.equal(vehicles.vehicleWrites.length, 1);
  assert.deepEqual(vehicles.vehicleWrites[0].filter, {
    _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
  });
  assert.equal(vehicles.vehicleWrites[0].update.$set.operationalStatus, "AVAILABLE");
  assert.deepEqual(releasedHolds, ["aaaaaaaaaaaaaaaaaaaaaaaa"]);
  assert.equal(sessionsStarted.length, 1);
  assert.equal(sessionsStarted[0].committed, true);
  assert.equal(sessionsStarted[0].aborted, false);
  assert.equal(bookings.rows[0].saves[0].validateBeforeSave, false);
});

test("reaper leaves a recent PENDING_PAYMENT booking alone", async () => {
  const { expired, bookings } = await runSweep({ rows: [pendingBooking(5)] });

  assert.equal(expired, 0);
  assert.equal(bookings.rows[0].bookingStatus, "PENDING_PAYMENT");
});

test("reaper does not touch bookings that already left PENDING_PAYMENT", async () => {
  const { expired, bookings } = await runSweep({
    rows: [
      pendingBooking(90, { _id: "111111111111111111111111", bookingStatus: "CONFIRMED" }),
      pendingBooking(90, { _id: "222222222222222222222222", bookingStatus: "CANCELLED" }),
    ],
  });

  assert.equal(expired, 0);
  assert.equal(bookings.findCalls[0].bookingStatus, "PENDING_PAYMENT");
});

test("reaper skips a stale booking that is already being paid", async () => {
  const { expired, bookings } = await runSweep({
    rows: [pendingBooking(90, { paymentStatus: "PAID" })],
  });

  assert.equal(expired, 0);
  assert.equal(bookings.findCalls[0].paymentStatus, "UNPAID");
});

test("reaper honours the admin-configured reservationExpiryMinutes", async () => {
  const { expired } = await runSweep({
    rows: [pendingBooking(45)],
    settings: { booking: { reservationExpiryMinutes: 60 } },
  });

  assert.equal(expired, 0);
});

test("reaper clamps a configured window below the minimum", async () => {
  const { expired } = await runSweep({
    rows: [pendingBooking(20)],
    settings: { booking: { reservationExpiryMinutes: 1 } },
  });

  assert.equal(expired, 1);
});

test("reaper falls back to the default window when the value is not a number", async () => {
  const { expired } = await runSweep({ rows: [pendingBooking(45)], env: "not-a-number" });

  assert.equal(expired, 1);
});

test("reaper still expires when the settings read fails", async () => {
  const { expired } = await runSweep({
    rows: [pendingBooking(45)],
    settings: new Error("mongo unavailable"),
  });

  assert.equal(expired, 1);
});

test("reaper never releases a vehicle that is under an open maintenance lock", async () => {
  const { expired, bookings, vehicles, payments } = await runSweep({
    rows: [pendingBooking(45)],
    openMaintenance: true,
  });

  assert.equal(expired, 1);
  assert.equal(bookings.rows[0].bookingStatus, "EXPIRED");
  assert.equal(payments.paymentWrites.length, 1, "the stale payment is still reconciled");
  assert.equal(vehicles.vehicleWrites.length, 0, "maintenance quarantine must survive the sweep");
});