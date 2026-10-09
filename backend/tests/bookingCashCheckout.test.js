import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Payment from "../models/payment_model.js";
import Vehicle from "../models/vehicle_model.js";
import paymentRouter from "../routes/paymentRoutes.js";
import {
  markCashPaymentCompleted,
  assertCashCollectionAccess,
} from "../services/paymentService.js";
import {
  bookingConcurrency,
  createBooking,
} from "../controllers/bookingController.js";

const userId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const vehicleId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const companyId = "cccccccccccccccccccccccc";

const invoke = (handler, req) =>
  new Promise((resolve) => {
    let statusCode = 200;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        resolve({ statusCode, body });
        return this;
      },
    };
    handler(req, res, (error) => {
      if (error) resolve({ statusCode: error.statusCode, error });
      else resolve({ statusCode, body: undefined });
    });
  });

const runCreateBooking = async (
  t,
  paymentMethod,
  {
    redisAvailable = true,
    redisAvailableAfterFirstCheck = redisAvailable,
    holdSuccess = true,
    lockSuccess = true,
    collision = null,
  } = {},
) => {
  const vehicle = {
    _id: vehicleId,
    companyId,
    dailyPrice: 100,
    pickupLocation: "Tripoli depot",
    listingStatus: "PUBLISHED",
    operationalStatus: "AVAILABLE",
  };
  const session = {
    committed: false,
    aborted: false,
    startTransaction() {},
    async commitTransaction() { this.committed = true; },
    async abortTransaction() { this.aborted = true; },
    endSession() {},
  };
  const bookingCreateOptions = [];
  const paymentCreateOptions = [];
  const concurrencyCalls = {
    availability: 0,
    holds: [],
    locks: [],
    releasedHolds: [],
    releasedLocks: 0,
  };
  let collisionQuery;
  let vehicleQuery;
  const claimOptions = [];
  const restoreCalls = [];
  let sessionStarts = 0;
  let bookingCreates = 0;
  const lock = {
    released: false,
    async release() {
      this.released = true;
      concurrencyCalls.releasedLocks += 1;
    },
  };

  t.mock.method(bookingConcurrency, "isRedisAvailable", async () => {
    concurrencyCalls.availability += 1;
    return concurrencyCalls.availability === 1
      ? redisAvailable
      : redisAvailableAfterFirstCheck;
  });
  t.mock.method(bookingConcurrency, "holdVehicleForCheckout", async (id, actorId) => {
    concurrencyCalls.holds.push({ id, actorId });
    return holdSuccess
      ? { success: true }
      : { success: false, message: "Vehicle is currently held by another user." };
  });
  t.mock.method(bookingConcurrency, "acquireVehicleLock", async (id, ttl) => {
    concurrencyCalls.locks.push({ id, ttl });
    if (!lockSuccess) throw new Error("Redis internal details must not leak");
    return lock;
  });
  t.mock.method(bookingConcurrency, "releaseVehicleHold", async (id) => {
    concurrencyCalls.releasedHolds.push(id);
  });
  t.mock.method(mongoose, "startSession", async () => {
    sessionStarts += 1;
    return session;
  });
  t.mock.method(Vehicle, "findById", () => ({
    session: async () => vehicle,
  }));
  t.mock.method(Vehicle, "findOneAndUpdate", async (filter, update, options) => {
    if (update.$set?.updatedAt instanceof Date) {
      vehicleQuery = filter;
      claimOptions.push(options);
      return vehicle;
    }
    restoreCalls.push({ filter, update, options });
    return { ...vehicle, operationalStatus: "AVAILABLE" };
  });
  t.mock.method(Booking, "findOne", (filter) => {
    collisionQuery = filter;
    return { session: async () => collision };
  });
  t.mock.method(Booking, "create", async (documents, options) => {
    bookingCreates += 1;
    bookingCreateOptions.push(options);
    return [{ ...documents[0], _id: "dddddddddddddddddddddddd" }];
  });
  t.mock.method(Payment, "create", async (documents, options) => {
    paymentCreateOptions.push({ documents, options });
    return documents.map((document) => ({
      ...document,
      _id: "eeeeeeeeeeeeeeeeeeeeeeee",
    }));
  });

  const response = await invoke(createBooking, {
    user: { id: userId },
    body: {
      vehicleId,
      startDate: "2026-11-01T10:00:00.000Z",
      endDate: "2026-11-04T10:00:00.000Z",
      ...(paymentMethod ? { paymentMethod } : {}),
    },
  });

  return {
    response,
    session,
    lock,
    vehicleQuery,
    collisionQuery,
    bookingCreateOptions,
    paymentCreateOptions,
    concurrencyCalls,
    sessionStarts,
    bookingCreates,
    claimOptions,
    restoreCalls,
  };
};

test("cash checkout creates a pending cash ledger entry atomically with an unpaid booking", async (t) => {
  const result = await runCreateBooking(t, "CASH_ON_DELIVERY");
  const { response, session, vehicleQuery, collisionQuery, paymentCreateOptions } = result;
  const booking = response.body.data.booking;
  const payment = response.body.data.payment;

  assert.equal(response.statusCode, 201);
  assert.equal(booking.bookingStatus, "PENDING_PAYMENT");
  assert.equal(booking.paymentStatus, "UNPAID");
  assert.equal(payment.bookingId, booking._id);
  assert.equal(payment.amount, booking.totalAmount);
  assert.equal(payment.paymentMethod, "CASH_ON_DELIVERY");
  assert.equal(payment.status, "PENDING");
  assert.equal(payment.paidAt, undefined);
  assert.equal(payment.collectedBy, undefined);
  assert.equal(paymentCreateOptions.length, 1);
  assert.equal(paymentCreateOptions[0].options.session, session);
  assert.equal(result.bookingCreateOptions[0].session, session);
  assert.equal(session.committed, true);
  assert.equal(session.aborted, false);
  assert.deepEqual(result.concurrencyCalls.holds, [{ id: vehicleId, actorId: userId }]);
  assert.deepEqual(result.concurrencyCalls.locks, [{ id: vehicleId, ttl: 10000 }]);
  assert.equal(result.concurrencyCalls.releasedLocks, 1);
  assert.deepEqual(result.concurrencyCalls.releasedHolds, [vehicleId]);
  assert.equal(vehicleQuery._id, vehicleId);
  assert.equal(vehicleQuery.listingStatus, "PUBLISHED");
  assert.equal(vehicleQuery.operationalStatus, "AVAILABLE");
  assert.equal(collisionQuery.vehicleId, vehicleId);
  assert.equal(result.claimOptions.length, 1);
  assert.equal(result.claimOptions[0].session, session);
  assert.equal(result.claimOptions[0].new, true);
  assert.equal(result.restoreCalls.length, 0);
});

test("card checkout creation remains pending without a cash payment record", async (t) => {
  const { response, session, paymentCreateOptions } = await runCreateBooking(t);

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.data.booking.bookingStatus, "PENDING_PAYMENT");
  assert.equal(response.body.data.booking.paymentStatus, "UNPAID");
  assert.equal(response.body.data.payment, undefined);
  assert.equal(paymentCreateOptions.length, 0);
  assert.equal(session.committed, true);
});

test("booking creation fails closed when Redis is unavailable", async (t) => {
  const result = await runCreateBooking(t, undefined, { redisAvailable: false });

  assert.equal(result.response.statusCode, 503);
  assert.match(result.response.error.message, /temporarily unavailable/);
  assert.doesNotMatch(result.response.error.message, /Redis internal/);
  assert.equal(result.sessionStarts, 0);
  assert.equal(result.bookingCreates, 0);
  assert.equal(result.concurrencyCalls.holds.length, 0);
  assert.equal(result.concurrencyCalls.locks.length, 0);
});

test("booking creation stops when the checkout hold cannot be acquired", async (t) => {
  const result = await runCreateBooking(t, undefined, { holdSuccess: false });

  assert.equal(result.response.statusCode, 409);
  assert.equal(result.sessionStarts, 0);
  assert.equal(result.bookingCreates, 0);
  assert.equal(result.concurrencyCalls.locks.length, 0);
});

test("booking creation releases its hold and creates nothing when lock acquisition fails", async (t) => {
  const result = await runCreateBooking(t, undefined, { lockSuccess: false });

  assert.equal(result.response.statusCode, 429);
  assert.match(result.response.error.message, /processing another checkout/);
  assert.doesNotMatch(result.response.error.message, /Redis internal/);
  assert.equal(result.sessionStarts, 0);
  assert.equal(result.bookingCreates, 0);
  assert.deepEqual(result.concurrencyCalls.releasedHolds, [vehicleId]);
});

test("booking creation returns unavailable if Redis drops during lock acquisition", async (t) => {
  const result = await runCreateBooking(t, undefined, {
    lockSuccess: false,
    redisAvailableAfterFirstCheck: false,
  });

  assert.equal(result.response.statusCode, 503);
  assert.match(result.response.error.message, /temporarily unavailable/);
  assert.doesNotMatch(result.response.error.message, /Redis internal/);
  assert.equal(result.sessionStarts, 0);
  assert.equal(result.bookingCreates, 0);
  assert.deepEqual(result.concurrencyCalls.releasedHolds, [vehicleId]);
});

test("existing booking collision aborts the transaction and releases concurrency controls", async (t) => {
  const collision = { _id: "ffffffffffffffffffffffff", bookingStatus: "CONFIRMED" };
  const result = await runCreateBooking(t, undefined, { collision });

  assert.equal(result.response.statusCode, 409);
  assert.equal(result.session.committed, false);
  assert.equal(result.session.aborted, true);
  assert.equal(result.bookingCreates, 0);
  assert.equal(result.concurrencyCalls.releasedLocks, 1);
  assert.deepEqual(result.concurrencyCalls.releasedHolds, [vehicleId]);
});

// ---------------------------------------------------------------------------
// P1-6: manual cash collection (markCashPaymentCompleted)
// ---------------------------------------------------------------------------

const paymentId = "111111111111111111111111";
const bookingId = "222222222222222222222222";
const companyActorId = "333333333333333333333333";

const makeCashPaymentDoc = (overrides = {}) => ({
  _id: paymentId,
  bookingId,
  customerId: userId,
  companyId,
  amount: 300,
  paymentMethod: "CASH_ON_DELIVERY",
  status: "PENDING",
  payoutStatus: "UNSETTLED",
  ...overrides,
});

const makeBookingDoc = (overrides = {}) => ({
  _id: bookingId,
  bookingStatus: "PENDING_PAYMENT",
  paymentStatus: "UNPAID",
  ...overrides,
});

const makeCompanyActor = (tenant, overrides = {}) => ({
  _id: companyActorId,
  id: companyActorId,
  role: "company",
  company: tenant,
  ...overrides,
});

const makeAdminActor = () => ({
  _id: "444444444444444444444444",
  id: "444444444444444444444444",
  role: "admin",
});

// Shared fake transaction session + captures. Mocks the document-loading query
// chain (`session()`) and the atomic guarded flip, mirroring how the service is
// consumed in production.
const setupCollectMocks = (
  t,
  {
    payment = makeCashPaymentDoc(),
    booking = makeBookingDoc(),
    findOneAndUpdateResult,
  } = {},
) => {
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
  const updates = [];
  const saves = [];

  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(Payment, "findById", () => ({
    session: async () => payment,
  }));
  t.mock.method(Booking, "findById", () => ({
    session: async () => booking,
  }));
  t.mock.method(Payment, "findOneAndUpdate", async (filter, update, options) => {
    updates.push({ filter, update, options });
    return findOneAndUpdateResult === undefined
      ? { ...payment, ...(update.$set || {}) }
      : findOneAndUpdateResult;
  });

  // A plain booking fixture; the service calls `save` with the session options.
  booking.save = async (options) => {
    saves.push(options);
    return booking;
  };

  return { session, updates, saves, booking };
};

test("marking cash as collected stamps the settlement auditor and timestamp", async (t) => {
  const cashPayment = makeCashPaymentDoc();
  const booking = makeBookingDoc();
  const actor = makeCompanyActor(companyId);
  setupCollectMocks(t, { payment: cashPayment, booking });

  const result = await markCashPaymentCompleted({
    paymentId: cashPayment._id,
    actorUser: actor,
    tenantId: companyId,
  });

  assert.equal(result.payment.paymentMethod, "CASH_ON_DELIVERY");
  assert.equal(result.payment.status, "COMPLETED");
  assert.equal(result.payment.paidAt instanceof Date, true);
  assert.ok(result.payment.collectedAt instanceof Date, "collectedAt must be set");
});

test("the owning company can collect a pending cash payment and settles the booking", async (t) => {
  const payment = makeCashPaymentDoc();
  const booking = makeBookingDoc();
  const actor = makeCompanyActor(companyId);
  const { session, updates, saves } = setupCollectMocks(t, { payment, booking });

  const result = await markCashPaymentCompleted({
    paymentId: payment._id,
    actorUser: actor,
    tenantId: companyId,
  });

  assert.equal(result.payment.status, "COMPLETED");
  assert.equal(result.payment.collectedBy, actor._id);
  assert.equal(booking.paymentStatus, "PAID");
  assert.equal(
    booking.bookingStatus,
    "CONFIRMED",
    "collecting cash advances PENDING_PAYMENT to CONFIRMED per the lifecycle matrix",
  );
  assert.deepEqual(updates[0].filter, { _id: payment._id, status: "PENDING" });
  assert.equal(updates[0].update.$set.status, "COMPLETED");
  assert.equal(updates[0].options.new, true);
  assert.equal(updates[0].options.session, session);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].session, session);
  assert.equal(saves[0].validateBeforeSave, false);
  assert.equal(session.committed, true);
  assert.equal(session.aborted, false);
});

test("a platform admin can collect cash on behalf of any company", async (t) => {
  const payment = makeCashPaymentDoc();
  const booking = makeBookingDoc();
  const admin = makeAdminActor();
  const { updates } = setupCollectMocks(t, { payment, booking });

  const result = await markCashPaymentCompleted({
    paymentId: payment._id,
    actorUser: admin,
  });

  assert.equal(result.payment.status, "COMPLETED");
  assert.equal(result.payment.collectedBy, admin._id);
  assert.equal(updates.length, 1);
  assert.equal(booking.paymentStatus, "PAID");
});

test("collecting cash never demotes a booking that already changed hands", async (t) => {
  const payment = makeCashPaymentDoc();
  const booking = makeBookingDoc({
    bookingStatus: "ACTIVE",
    paymentStatus: "UNPAID",
  });
  const actor = makeCompanyActor(companyId);
  setupCollectMocks(t, { payment, booking });

  const result = await markCashPaymentCompleted({
    paymentId: payment._id,
    actorUser: actor,
    tenantId: companyId,
  });

  assert.equal(result.payment.status, "COMPLETED");
  assert.equal(booking.paymentStatus, "PAID");
  assert.equal(booking.bookingStatus, "ACTIVE", "active rentals keep their state");
});

test("a company cannot collect another company's cash payment", async (t) => {
  const payment = makeCashPaymentDoc();
  const booking = makeBookingDoc();
  const intruder = makeCompanyActor("999999999999999999999999");
  const { session, updates, saves } = setupCollectMocks(t, { payment, booking });

  await assert.rejects(
    markCashPaymentCompleted({
      paymentId: payment._id,
      actorUser: intruder,
      tenantId: intruder.company,
    }),
    (err) => err.statusCode === 403,
  );

  assert.equal(updates.length, 0, "no ledger write for a foreign company");
  assert.equal(saves.length, 0);
  assert.equal(session.committed, false);
  assert.equal(session.aborted, true);
});

test("an already-completed cash payment cannot be collected again", async (t) => {
  const payment = makeCashPaymentDoc({ status: "COMPLETED" });
  const booking = makeBookingDoc({ paymentStatus: "PAID" });
  const actor = makeAdminActor();
  const { session, updates } = setupCollectMocks(t, { payment, booking });

  await assert.rejects(
    markCashPaymentCompleted({ paymentId: payment._id, actorUser: actor }),
    (err) => err.statusCode === 409,
  );

  assert.equal(updates.length, 0);
  assert.equal(session.committed, false);
  assert.equal(session.aborted, true);
});

test("a refunded cash payment cannot be collected", async (t) => {
  const payment = makeCashPaymentDoc({ status: "REFUNDED" });
  const booking = makeBookingDoc();
  const actor = makeAdminActor();
  const { session, updates } = setupCollectMocks(t, { payment, booking });

  await assert.rejects(
    markCashPaymentCompleted({ paymentId: payment._id, actorUser: actor }),
    (err) => err.statusCode === 409,
  );

  assert.equal(updates.length, 0);
  assert.equal(session.committed, false);
  assert.equal(session.aborted, true);
});

test("a non-cash payment cannot be marked as collected manually", async (t) => {
  const payment = makeCashPaymentDoc({
    paymentMethod: "MOAMALAT",
    status: "PENDING",
  });
  const booking = makeBookingDoc();
  const actor = makeCompanyActor(companyId);
  const { session, updates } = setupCollectMocks(t, { payment, booking });

  await assert.rejects(
    markCashPaymentCompleted({
      paymentId: payment._id,
      actorUser: actor,
      tenantId: companyId,
    }),
    (err) => err.statusCode === 400,
  );

  assert.equal(updates.length, 0);
  assert.equal(session.committed, false);
  assert.equal(session.aborted, true);
});

test("cash on a cancelled booking is refused so revenue is not booked for a trip that never happened", async (t) => {
  const payment = makeCashPaymentDoc();
  const booking = makeBookingDoc({
    bookingStatus: "CANCELLED",
    paymentStatus: "UNPAID",
  });
  const actor = makeCompanyActor(companyId);
  const { session, updates } = setupCollectMocks(t, { payment, booking });

  await assert.rejects(
    markCashPaymentCompleted({
      paymentId: payment._id,
      actorUser: actor,
      tenantId: companyId,
    }),
    (err) => err.statusCode === 409,
  );

  assert.equal(updates.length, 0);
  assert.equal(session.committed, false);
  assert.equal(session.aborted, true);
});

test("a second concurrent collector cannot double-collect the same payment", async (t) => {
  const payment = makeCashPaymentDoc();
  const booking = makeBookingDoc();
  const actor = makeCompanyActor(companyId);
  // The first clerk already flipped the row; findOneAndUpdate matches nothing.
  const { session, updates, saves } = setupCollectMocks(t, {
    payment,
    booking,
    findOneAndUpdateResult: null,
  });

  await assert.rejects(
    markCashPaymentCompleted({
      paymentId: payment._id,
      actorUser: actor,
      tenantId: companyId,
    }),
    (err) => err.statusCode === 409,
  );

  assert.equal(updates.length, 1, "the guarded flip was attempted exactly once");
  assert.equal(saves.length, 0, "no booking save when the ledger was not flipped");
  assert.equal(session.committed, false);
  assert.equal(session.aborted, true);
});

test("collection permission is proven before payment state is revealed", async (t) => {
  const payment = makeCashPaymentDoc({ status: "COMPLETED" });
  const intruder = makeCompanyActor("999999999999999999999999");
  const { updates } = setupCollectMocks(t, { payment, booking: makeBookingDoc() });

  await assert.rejects(
    markCashPaymentCompleted({
      paymentId: payment._id,
      actorUser: intruder,
      tenantId: intruder.company,
    }),
    (err) => err.statusCode === 403,
    "an attacker must always see 403, never the real status",
  );

  assert.equal(updates.length, 0);
});

test("assertCashCollectionAccess refuses customers and anonymous callers", async (t) => {
  const payment = makeCashPaymentDoc();

  assert.throws(
    () => assertCashCollectionAccess(payment, null, companyId),
    (err) => err.statusCode === 401,
  );
  assert.throws(
    () =>
      assertCashCollectionAccess(payment, { role: "customer", id: userId }),
    (err) => err.statusCode === 403,
  );
});

// ---------------------------------------------------------------------------
// P1-6 route wiring: PATCH /api/v1/payments/:id/collect-cash
// ---------------------------------------------------------------------------

const routeHandlers = (router, path, method) => {
  const layer = router.stack.find(
    (item) => item.route?.path === path && item.route.methods?.[method],
  );
  assert.ok(layer, `expected route ${method.toUpperCase()} ${path}`);
  return layer.route.stack.map((item) => item.handle);
};

const createResponse = () => {
  const state = { statusCode: 200, body: undefined, ended: false };
  const res = {
    status(code) {
      state.statusCode = code;
      return res;
    },
    json(body) {
      state.body = body;
      state.ended = true;
      return res;
    },
  };
  return { res, state };
};

const runChain = async (handlers, req) => {
  const { res, state } = createResponse();

  for (const handler of handlers) {
    let calledNext = false;
    let error = null;

    await new Promise((resolve) => {
      handler(req, res, (err) => {
        calledNext = true;
        error = err;
        resolve();
      });
      setImmediate(resolve);
    });

    if (error) return { error, ...state };
    if (!calledNext) return { ...state };
  }

  return { ...state };
};

test("the collect-cash route is tenant-gated before the handler runs", async (t) => {
  const handlers = routeHandlers(paymentRouter, "/:id/collect-cash", "patch");
  const foreignPayment = makeCashPaymentDoc();
  const intruder = makeCompanyActor("999999999999999999999999");

  t.mock.method(Payment, "findById", () => ({
    then: (resolve) => resolve(foreignPayment),
  }));

  const outcome = await runChain(handlers, {
    params: { id: paymentId },
    user: intruder,
    tenantId: intruder.company,
  });

  assert.ok(outcome.error, "a foreign company request must be refused");
  assert.equal(outcome.error.statusCode, 403);
  assert.equal(outcome.ended, false, "the handler must never run");
});

test("the collect-cash route rejects customers before any lookup", async (t) => {
  const handlers = routeHandlers(paymentRouter, "/:id/collect-cash", "patch");
  const customer = { id: userId, role: "customer" };
  const findByIdCalls = 0;

  const prior = Payment.findById;
  Payment.findById = () => {
    throw new Error("customer must be blocked before any DB lookup");
  };

  try {
    const outcome = await runChain(handlers, {
      params: { id: paymentId },
      user: customer,
      tenantId: null,
    });

    assert.equal(outcome.error.statusCode, 403);
    assert.equal(findByIdCalls, 0);
  } finally {
    Payment.findById = prior;
  }
});

test("the collect-cash route completes for the owning company", async (t) => {
  const handlers = routeHandlers(paymentRouter, "/:id/collect-cash", "patch");
  const payment = makeCashPaymentDoc();
  const booking = makeBookingDoc();
  const actor = makeCompanyActor(companyId);

  t.mock.method(mongoose, "startSession", async () => ({
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
  }));
  t.mock.method(Payment, "findOneAndUpdate", async (filter, update) => ({
    ...payment,
    ...(update.$set || {}),
  }));
  booking.save = async () => booking;
  // Must satisfy both the tenant gate (bare await) and the service (`session()`).
  t.mock.method(Payment, "findById", () => ({
    session: async () => payment,
    then: (resolve) => resolve(payment),
  }));
  t.mock.method(Booking, "findById", () => ({
    session: async () => booking,
  }));

  const outcome = await runChain(handlers, {
    params: { id: paymentId },
    user: actor,
    tenantId: companyId,
  });

  assert.equal(outcome.error, undefined);
  assert.equal(outcome.statusCode, 200);
  assert.equal(outcome.body.data.payment.status, "COMPLETED");
  assert.equal(outcome.body.data.payment.collectedBy, actor._id);
  assert.equal(outcome.body.data.booking.paymentStatus, "PAID");
});
