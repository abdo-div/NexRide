import assert from "node:assert/strict";
import { test, before, after, beforeEach } from "node:test";
import mongoose from "mongoose";
import Payment from "../models/payment_model.js";
// Registered so the Payment pre-save hook can resolve Company for the payout
// split; Payment.create() needs that schema present.
import "../models/Company_model.js";
import { syncAllIndexes } from "../utils/syncIndexes.js";

/**
 * P0-2 / P1-4 integration coverage against a real MongoDB.
 *
 * These assertions are only meaningful against a live server: the defect was in
 * how MongoDB builds a unique index over `null` values, which no stub can
 * reproduce. Skipped when no database is reachable so the default `npm test`
 * run stays self-contained.
 */

const TEST_URI =
  process.env.TEST_MONGODB_URI ??
  process.env.MONGODB_URI ??
  "mongodb://127.0.0.1:27017/nexride_index_test?directConnection=true";

const DB_NAME = "nexride_index_test";

let connected = false;

// Connect before any test is declared so `skip` can be resolved as a plain
// boolean. A function-based `skip` would be evaluated before `before()` ran and
// would skip everything.
try {
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 4000 });
  connected = true;
} catch {
  connected = false;
}

const noDatabase = connected ? false : "no MongoDB available";

const basePayment = (overrides = {}) => ({
  bookingId: new mongoose.Types.ObjectId(),
  customerId: new mongoose.Types.ObjectId(),
  companyId: new mongoose.Types.ObjectId(),
  amount: 100,
  paymentMethod: "CASH_ON_DELIVERY",
  status: "PENDING",
  payoutStatus: "UNSETTLED",
  ...overrides,
});

before(async () => {
  if (!connected) return;

  // Models declare autoIndex:false in production, so build indexes the way a
  // deployment must: through the migration runner.
  await syncAllIndexes({ enabled: true });
});

after(async () => {
  if (!connected) return;
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
});

beforeEach(async () => {
  if (!connected) return;
  await Payment.deleteMany({});
});

test(
  "two consecutive cash payments commit without a duplicate key error",
  { skip: noDatabase },
  async () => {
    // A cash-on-delivery payment carries no gateway identifiers. These are the
    // rows that used to collide platform-wide on the second insert.
    const first = await Payment.create([basePayment()]);
    const second = await Payment.create([basePayment()]);

    assert.equal(first.length, 1);
    assert.equal(second.length, 1);
    assert.notEqual(first[0]._id.toString(), second[0]._id.toString());
    assert.equal(await Payment.countDocuments({}), 2);
  },
);

test(
  "many cash payments with omitted identifiers do not collide",
  { skip: noDatabase },
  async () => {
    const payments = Array.from({ length: 25 }, () => basePayment());
    await Payment.create(payments);
    assert.equal(await Payment.countDocuments({}), 25);
  },
);

test(
  "legacy rows that already stored an explicit null still do not collide",
  { skip: noDatabase },
  async () => {
    // Databases written before this fix contain explicit nulls. The partial
    // index must tolerate them, otherwise the migration fails on real data.
    await Payment.collection.insertMany([
      basePayment({ transactionId: null, merchantReference: null }),
      basePayment({ transactionId: null, merchantReference: null }),
    ]);

    const third = await Payment.create([basePayment()]);
    assert.equal(third.length, 1);
    assert.equal(await Payment.countDocuments({}), 3);
  },
);

test(
  "gateway transactionId remains unique across different payments",
  { skip: noDatabase },
  async () => {
    await Payment.create([basePayment({ transactionId: "TX-UNIQUE-1" })]);

    await assert.rejects(
      () => Payment.create([basePayment({ transactionId: "TX-UNIQUE-1" })]),
      (err) => err.code === 11000 || err.code === 11001,
      "duplicate gateway transactionId must still be rejected",
    );
  },
);

test(
  "gateway merchantReference remains unique across different payments",
  { skip: noDatabase },
  async () => {
    await Payment.create([basePayment({ merchantReference: "REF-UNIQUE-1" })]);

    await assert.rejects(
      () => Payment.create([basePayment({ merchantReference: "REF-UNIQUE-1" })]),
      (err) => err.code === 11000 || err.code === 11001,
      "duplicate merchant reference must still be rejected",
    );
  },
);

test(
  "distinct gateway identifiers coexist alongside cash payments",
  { skip: noDatabase },
  async () => {
    await Payment.create([
      basePayment(),
      basePayment({ transactionId: "TX-A" }),
      basePayment({ transactionId: "TX-B" }),
    ]);

    assert.equal(await Payment.countDocuments({}), 3);
    assert.equal(
      await Payment.countDocuments({ transactionId: { $type: "string" } }),
      2,
    );
  },
);

test(
  "payment index declarations use a partial unique index, not sparse",
  { skip: noDatabase },
  async () => {
    const indexes = Payment.schema.indexes();

    for (const field of ["transactionId", "merchantReference"]) {
      const declaration = indexes.find(
        ([fields]) => Object.keys(fields)[0] === field,
      );
      assert.ok(declaration, `${field} index must be declared`);

      const options = declaration[1];
      assert.equal(options.unique, true, `${field} must stay unique`);
      assert.equal(
        options.sparse,
        undefined,
        `${field} must not use sparse, which indexes null values`,
      );
      assert.deepEqual(options.partialFilterExpression, {
        [field]: { $type: "string" },
      });
    }

    // And the built index must match the declaration.
    const built = await Payment.collection.indexes();
    for (const field of ["transactionId", "merchantReference"]) {
      const index = built.find((entry) => entry.name === `${field}_1`);
      assert.ok(index, `${field}_1 must exist in the collection`);
      assert.equal(index.unique, true);
      assert.ok(
        index.partialFilterExpression,
        `${field}_1 must be partial so null values are excluded`,
      );
    }
  },
);

test(
  "syncIndexes completes without index collision errors",
  { skip: noDatabase },
  async () => {
    const { ran, results } = await syncAllIndexes({ enabled: true });

    assert.equal(ran, true);
    const failed = results.filter((entry) => entry.status === "failed");
    assert.deepEqual(
      failed.map((entry) => `${entry.model}: ${entry.error}`),
      [],
    );
    assert.ok(results.length > 0, "sync must cover the registered models");
  },
);

test(
  "syncIndexes is a no-op when not explicitly enabled",
  { skip: noDatabase },
  async () => {
    const original = process.env.SYNC_INDEXES;
    delete process.env.SYNC_INDEXES;

    try {
      const { ran, reason } = await syncAllIndexes();
      assert.equal(ran, false);
      assert.match(reason, /SYNC_INDEXES/);
    } finally {
      if (original !== undefined) process.env.SYNC_INDEXES = original;
    }
  },
);

test(
  "syncIndexes leaves working data intact",
  { skip: noDatabase },
  async () => {
    await Payment.create([basePayment(), basePayment({ transactionId: "TX-KEEP" })]);

    await syncAllIndexes({ enabled: true });

    assert.equal(await Payment.countDocuments({}), 2);
  },
);

