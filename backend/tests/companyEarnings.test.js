import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Payment from "../models/payment_model.js";
import Booking from "../models/booking_model.js";
import Vehicle from "../models/vehicle_model.js";
import Company from "../models/Company_model.js";
import User from "../models/User_model.js";
import PlatformSettings from "../models/PlatformSettings_model.js";
import {
  getCompanyEarnings,
  getCompanyPayoutSummary,
} from "../controllers/paymentController.js";
import { buildCompanyEarnings } from "../services/companyEarningsService.js";

const companyA = "bbbbbbbbbbbbbbbbbbbbbbbb";
const companyB = "dddddddddddddddddddddddd";
const customerA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const vehicleA = "cccccccccccccccccccccccc";
const vehicleB = "eeeeeeeeeeeeeeeeeeeeeeee";
const vehicleC = "333333333333333333333333";
const adminId = "999999999999999999999999";

const companyUser = (overrides = {}) => ({
  _id: customerA,
  id: customerA,
  role: "company",
  company: companyA,
  ...overrides,
});

const thenable = (value) => ({ then: (resolve) => resolve(value) });

const ledgerChain = (docs = []) => {
  const chain = {
    sort() {
      return chain;
    },
    skip() {
      return chain;
    },
    limit() {
      return chain;
    },
    populate() {
      return chain;
    },
    then(resolve) {
      resolve(docs);
    },
  };
  return chain;
};

const deckFacet = () => ({
  current: [
    {
      gross: 12450,
      platformTake: 996,
      companyEarnings: 11454,
      unsettled: 5000,
      processing: 2000,
      settled: 5450,
      bookings: 18,
    },
  ],
  previous: [{ gross: 10820 }],
});

const yieldRows = () => [
  {
    _id: vehicleA,
    gross: 6000,
    bookings: 6,
    vehicle: { _id: vehicleA, make: "BMW", model: "520i", year: 2024, type: "SEDAN", photos: ["bmw.jpg"] },
  },
  {
    _id: vehicleB,
    gross: 2400,
    bookings: 3,
    vehicle: { _id: vehicleB, make: "Toyota", model: "Camry", year: 2023, type: "SEDAN", photos: [] },
  },
  {
    _id: vehicleC,
    gross: 4050,
    bookings: 9,
    vehicle: { _id: vehicleC, make: "Range Rover", model: "Vogue", year: 2025, type: "LUXURY", photos: [] },
  },
];

const chartRows = () => [
  {
    _id: "abcabcabcabcabcabcabcab1",
    amount: 2400,
    commissionAmount: 192,
    companyShare: 2208,
    status: "COMPLETED",
    refundAmount: 0,
    paidAt: new Date(),
    createdAt: new Date(),
  },
  {
    _id: "abcabcabcabcabcabcabcab2",
    amount: 600,
    commissionAmount: 48,
    companyShare: 552,
    status: "COMPLETED",
    refundAmount: 0,
    paidAt: new Date(),
    createdAt: new Date(),
  },
];

const ledgerDoc = (overrides = {}) => ({
  _id: "abcabcabcabcabcabcabcd01",
  amount: 2400,
  commissionAmount: 192,
  commissionRate: 8,
  companyShare: 2208,
  refundAmount: 0,
  paymentMethod: "MOAMALAT",
  merchantReference: "MR-100",
  transactionId: "TXN-100",
  status: "COMPLETED",
  payoutStatus: "UNSETTLED",
  paidAt: new Date("2026-10-03T10:00:00.000Z"),
  createdAt: new Date("2026-10-03T09:00:00.000Z"),
  customerId: {
    _id: customerA,
    name: "Ahmed Ali",
    email: "ahmed@example.com",
    phoneNumber: "+218910000000",
    photo: null,
  },
  bookingId: {
    _id: "eeeeeeeeeeeeeeeeeeeeeeee",
    pickupLocation: "Mitiga Airport VIP Valet Lounge",
    pickupMethod: "BRANCH_PICKUP",
    startDate: new Date("2026-10-01T10:00:00.000Z"),
    endDate: new Date("2026-10-04T10:00:00.000Z"),
    dailyRate: 600,
    totalDays: 3,
    rentalPrice: 1800,
    discountAmount: 0,
    commissionRate: 8,
    vehicleId: {
      _id: vehicleA,
      make: "BMW",
      model: "520i",
      year: 2024,
      type: "SEDAN",
      photos: ["bmw.jpg"],
    },
  },
  ...overrides,
});

/** Stubs every model the earnings service touches and records the queries. */
const stubWorkspace = (t, { facet = deckFacet(), ledgerDocs = [ledgerDoc()] } = {}) => {
  const sinks = {
    deckMatches: [],
    yieldMatches: [],
    chartMatches: [],
    listMatches: [],
    listCounts: [],
    bookingScopes: [],
    vehicleScopes: [],
    userScopes: [],
  };

  t.mock.method(Payment, "aggregate", (pipeline) => {
    if (pipeline.some((stage) => stage.$facet)) {
      sinks.deckMatches.push(pipeline[0].$match);
      return thenable([facet]);
    }
    if (pipeline.some((stage) => stage.$lookup && stage.$lookup.from === "bookings")) {
      sinks.yieldMatches.push(pipeline[0].$match);
      return thenable(yieldRows());
    }
    sinks.chartMatches.push(pipeline[0].$match);
    return thenable(chartRows());
  });

  t.mock.method(Payment, "countDocuments", (filter) => {
    sinks.listCounts.push(filter);
    return thenable(ledgerDocs.length);
  });

  t.mock.method(Payment, "find", (filter) => {
    sinks.listMatches.push(filter);
    return ledgerChain(ledgerDocs);
  });

  t.mock.method(Booking, "distinct", (field, filter) => {
    sinks.bookingScopes.push(filter);
    return thenable([]);
  });

  t.mock.method(Booking, "aggregate", () => thenable([]));

  t.mock.method(Vehicle, "distinct", (field, filter) => {
    sinks.vehicleScopes.push(filter);
    return thenable([]);
  });

  t.mock.method(User, "distinct", (field, filter) => {
    sinks.userScopes.push(filter);
    return thenable([customerA]);
  });

  t.mock.method(PlatformSettings, "findOne", () => thenable(null));

  t.mock.method(Company, "findById", () => ({
    select() {
      return thenable({
        _id: companyA,
        name: "Fleet A",
        slug: "fleet-a",
        customCommissionRate: 8,
      });
    },
  }));

  return sinks;
};

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
      if (error) resolve({ error, statusCode });
    });
  });

// ---------------------------------------------------------------------------
// Tenant scoping: a company session must stay pinned to its own tenant
// ---------------------------------------------------------------------------

test("earnings for a company session stay pinned to the session tenant", async (t) => {
  const sinks = stubWorkspace(t);

  const outcome = await invoke(getCompanyEarnings, {
    user: companyUser(),
    tenantId: companyA,
    query: { companyId: companyB, page: 1, limit: 8 }, // forged — must be ignored
  });

  assert.equal(outcome.statusCode, 200);
  assert.equal(
    sinks.deckMatches[0].companyId.toString(),
    companyA,
    "the deck must stay pinned to tenant A despite ?companyId=B",
  );
  assert.equal(sinks.yieldMatches[0].companyId.toString(), companyA);
  assert.equal(sinks.chartMatches[0].companyId.toString(), companyA);
  assert.equal(sinks.listMatches[0].companyId.toString(), companyA);
});

test("an admin may load earnings for another company via ?companyId", async (t) => {
  const sinks = stubWorkspace(t);

  const outcome = await invoke(getCompanyEarnings, {
    user: { _id: adminId, id: adminId, role: "admin" },
    tenantId: undefined,
    query: { companyId: companyB, page: 2, limit: 8 },
  });

  assert.equal(outcome.statusCode, 200);
  assert.equal(sinks.deckMatches[0].companyId.toString(), companyB);
  assert.equal(outcome.body.data.pagination.page, 2);
});

test("a company session without a linked tenant is rejected with 403", async (t) => {
  const sinks = stubWorkspace(t);

  const outcome = await invoke(getCompanyEarnings, {
    user: { _id: customerA, id: customerA, role: "company" },
    tenantId: undefined,
    query: {},
  });

  assert.equal(outcome.error.statusCode, 403);
  assert.equal(sinks.deckMatches.length, 0, "no aggregation may run");
  assert.equal(sinks.listMatches.length, 0);
});

test("a missing company document yields 404", async (t) => {
  const sinks = stubWorkspace(t);
  t.mock.method(Company, "findById", () => ({
    select() {
      return thenable(null);
    },
  }));

  const outcome = await invoke(getCompanyEarnings, {
    user: companyUser(),
    tenantId: companyA,
    query: {},
  });

  assert.equal(outcome.error.statusCode, 404);
});

test("invalid company identifiers are refused before any query", async () => {
  await assert.rejects(
    () => buildCompanyEarnings({ companyId: "not-a-valid-object-id" }),
    (err) => err.statusCode === 400,
  );
});

// ---------------------------------------------------------------------------
// Deck derivation honesty: every number comes from the real Payment documents
// ---------------------------------------------------------------------------

test("the deck recomputes revenue, take, net and liquidity from the payments", async (t) => {
  stubWorkspace(t);

  const earnings = await buildCompanyEarnings({
    companyId: companyA,
    page: 1,
    limit: 8,
  });

  assert.equal(earnings.company.name, "Fleet A");
  assert.equal(earnings.company.commissionRate, 8);
  assert.equal(earnings.summary.gross, 12450);
  assert.equal(earnings.summary.platformTake, 996);
  assert.equal(earnings.summary.companyEarnings, 11454);
  assert.equal(earnings.summary.effectiveRate, 8);
  assert.equal(earnings.summary.bookings, 18);
  assert.equal(earnings.summary.grossDeltaPct, 15.1);
  assert.equal(earnings.summary.available, 5000);
  assert.equal(earnings.summary.inEscrow, 2000);
  assert.equal(earnings.summary.disbursed, 5450);
});

test("the growth delta pill is null when there is no comparable previous window", async (t) => {
  stubWorkspace(t, { facet: { current: deckFacet().current } });

  const earnings = await buildCompanyEarnings({
    companyId: companyA,
    range: "all",
    page: 1,
    limit: 8,
  });

  // "all" has no prior window -> no delta is invented.
  assert.equal(earnings.summary.grossDeltaPct, null);
});

test("the vehicle yield is ranked by real gross with shares of real fleet revenue", async (t) => {
  stubWorkspace(t);

  const earnings = await buildCompanyEarnings({ companyId: companyA, page: 1, limit: 8 });

  assert.equal(earnings.topVehicles.length, 3);
  const [first, , third] = earnings.topVehicles;
  assert.equal(first.rank, 1);
  assert.equal(first.vehicle.make, "BMW");
  assert.equal(first.gross, 6000);
  assert.equal(first.sharePct, 48.2);
  assert.equal(third.vehicle.make, "Toyota");
  assert.equal(third.sharePct, 19.3);

  // Fleet mix buckets by the real vehicle type: two SEDANs + one LUXURY.
  const sedan = earnings.mix.find((m) => m.type === "SEDAN");
  const luxury = earnings.mix.find((m) => m.type === "LUXURY");
  assert.equal(sedan.gross, 8400);
  assert.equal(sedan.pct, 67.5);
  assert.equal(luxury.gross, 4050);
  assert.equal(luxury.pct, 32.5);
});

test("the register rows carry real populated customer, booking and vehicle context", async (t) => {
  stubWorkspace(t);

  const earnings = await buildCompanyEarnings({ companyId: companyA, page: 1, limit: 8 });

  assert.equal(earnings.list.length, 1);
  assert.equal(earnings.pagination.total, 1);
  const row = earnings.list[0];
  assert.equal(row.trxRef, "#TRX-ABCD01");
  assert.equal(row.amount, 2400);
  assert.equal(row.commissionRate, 8);
  assert.equal(row.companyShare, 2208);
  assert.equal(row.customer.name, "Ahmed Ali");
  assert.equal(row.customer.phone, "+218910000000");
  assert.equal(row.booking.reference, "NX-" + String("eeeeeeeeeeeeeeeeeeeeeeee").slice(-6).toUpperCase());
  assert.equal(row.booking.pickupLocation, "Mitiga Airport VIP Valet Lounge");
  assert.equal(row.booking.totalDays, 3);
  assert.equal(row.booking.dailyRate, 600);
  assert.equal(row.vehicle.make, "BMW");
  assert.equal(row.vehicle.type, "SEDAN");
});

test("the chart window shape matches the requested chart range", async (t) => {
  stubWorkspace(t);

  const earnings = await buildCompanyEarnings({
    companyId: companyA,
    chartRange: "30d",
    page: 1,
    limit: 8,
  });

  assert.equal(earnings.chart.range, "30d");
  assert.equal(earnings.chart.buckets.length, 5);
  const grossTotal = earnings.chart.buckets.reduce((sum, b) => sum + b.gross, 0);
  assert.equal(grossTotal, 3000);
  assert.ok(earnings.chart.avgTakePerDay > 0, "avg take per day comes from real net");
  assert.ok(earnings.chart.topWindow?.label, "highest interval is drawn from the real series");
});

test("7d, 3m and 12m chart ranges produce their documented bucket counts", async (t) => {
  stubWorkspace(t);

  const counts = ["7d", "30d", "3m", "12m"].map(async (chartRange) => {
    const earnings = await buildCompanyEarnings({ companyId: companyA, chartRange });
    return earnings.chart.buckets.length;
  });

  assert.deepEqual(await Promise.all(counts), [7, 5, 13, 12]);
});

// ---------------------------------------------------------------------------
// Register filters map onto the scoped list query (deck stays unfiltered)
// ---------------------------------------------------------------------------

test("status chips scope the list query without touching the deck", async (t) => {
  const sinks = stubWorkspace(t);

  await buildCompanyEarnings({
    companyId: companyA,
    page: 1,
    limit: 8,
    status: "paid",
  });

  const listMatch = sinks.listMatches[0];
  const serialized = JSON.stringify(listMatch);
  assert.ok(serialized.includes("COMPLETED"), "paid = completed status");
  assert.ok(serialized.includes("SETTLED"), "paid = settled payout state");
  assert.deepEqual(sinks.listCounts[0], listMatch, "total counts the same filter");
});

test("escrow, completed and refunded chips map to real ledger predicates", async (t) => {
  const sinks = stubWorkspace(t);

  await buildCompanyEarnings({
    companyId: companyA,
    page: 1,
    limit: 8,
    status: "escrow",
  });
  const escrow = JSON.stringify(sinks.listMatches[0]);
  assert.ok(escrow.includes("PROCESSING"));

  sinks.listMatches.length = 0;
  await buildCompanyEarnings({
    companyId: companyA,
    page: 1,
    limit: 8,
    status: "completed",
  });
  const completed = JSON.stringify(sinks.listMatches[0]);
  assert.ok(completed.includes("UNSETTLED"));

  sinks.listMatches.length = 0;
  await buildCompanyEarnings({
    companyId: companyA,
    page: 1,
    limit: 8,
    status: "refunded",
  });
  assert.ok(JSON.stringify(sinks.listMatches[0]).includes("PARTIALLY_REFUNDED"));
});

test("vehicle, method and search filters scope the list query to the tenant", async (t) => {
  const sinks = stubWorkspace(t);

  await buildCompanyEarnings({
    companyId: companyA,
    page: 1,
    limit: 8,
    vehicleId: vehicleA,
    method: "moamalat",
    search: "Ahmed",
  });

  const listMatch = sinks.listMatches[0];
  assert.deepEqual(sinks.bookingScopes[0], {
    companyId: new mongoose.Types.ObjectId(companyA),
    vehicleId: new mongoose.Types.ObjectId(vehicleA),
  });
  assert.ok(JSON.stringify(listMatch).includes("MOAMALAT"));
  assert.deepEqual(sinks.userScopes[0].$or[0], { name: /Ahmed/i });
});

// ---------------------------------------------------------------------------
// Payout rail description falls back to the documented platform defaults
// ---------------------------------------------------------------------------

test("the payout rail uses the platform registry schedule and clearing bank", async (t) => {
  stubWorkspace(t);
  t.mock.method(PlatformSettings, "findOne", () =>
    thenable({
      commission: {
        payoutSchedule: "Biweekly on Wednesdays",
        clearingBank: "Central Bank of Libya",
      },
    }),
  );

  const earnings = await buildCompanyEarnings({ companyId: companyA, page: 1, limit: 8 });

  assert.equal(earnings.settings.payoutSchedule, "Biweekly on Wednesdays");
  assert.equal(earnings.settings.clearingBank, "Central Bank of Libya");
});

test("a missing settings registry falls back to the schema defaults", async (t) => {
  stubWorkspace(t);

  const earnings = await buildCompanyEarnings({ companyId: companyA, page: 1, limit: 8 });

  assert.equal(earnings.settings.payoutSchedule, "Weekly on Thursdays");
  assert.equal(earnings.settings.clearingBank, "Libyan Foreign Bank (LFB)");
});

// ---------------------------------------------------------------------------
// The shared paymentService payout-summary surface still behaves as before
// ---------------------------------------------------------------------------

test("getCompanyPayoutSummary still resolves the session tenant", async (t) => {
  t.mock.method(Payment, "aggregate", () => thenable([]));

  const outcome = await invoke(getCompanyPayoutSummary, {
    user: companyUser(),
    tenantId: companyA,
    query: { companyId: companyB },
  });

  assert.equal(outcome.statusCode, 200);
});