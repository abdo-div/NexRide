import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import { getCompanyBookings } from "../controllers/companyBookingsController.js";
import { buildCompanyBookings } from "../services/companyBookingsService.js";

const customerA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const companyA = "cccccccccccccccccccccccc";
const companyB = "dddddddddddddddddddddddd";
const adminId = "999999999999999999999999";

const companyUser = (overrides = {}) => ({
  _id: customerA,
  id: customerA,
  role: "company",
  company: companyA,
  ...overrides,
});

const queryChain = (docs = []) => {
  const Chain = {
    _docs: docs,
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    select() {
      return this;
    },
    lean() {
      return this;
    },
    populate() {
      return this;
    },
    then(resolve) {
      resolve(this._docs);
    },
  };
  return Chain;
};

const thenable = (value) => ({ then: (resolve) => resolve(value) });

/** Realistic booking row the mapper has to digest after the $lookup joins. */
const bookingRow = (overrides = {}) => ({
  _id: "eeeeeeeeeeeeeeeeeeeeeeee",
  bookingStatus: "CONFIRMED",
  paymentStatus: "PAID",
  pickupMethod: "DELIVERY",
  pickupLocation: "Tripoli Mitiga Int'l Airport",
  startDate: new Date("2026-10-08T10:00:00.000Z"),
  endDate: new Date("2026-10-12T10:00:00.000Z"),
  totalDays: 4,
  totalAmount: 2400,
  dailyRate: 600,
  companyShare: 2040,
  customer: { _id: customerA, name: "Ahmed Ali", phoneNumber: "+218 91 382 9910" },
  vehicle: {
    _id: "ffffffffffffffffffffffff",
    make: "BMW",
    model: "520i",
    year: 2024,
    type: "LUXURY",
    city: "Tripoli",
    operationalStatus: "AVAILABLE",
  },
  payments: [{ status: "COMPLETED", paymentMethod: "MOAMALAT", payoutStatus: "UNSETTLED" }],
  resolvedPayment: "PAID",
  ...overrides,
});

/**
 * Stubs every ledger the bookings service touches so the controller/service can
 * be exercised without a database. The list pipeline (identifiable by its
 * $lookup stage) and the summary group are answered separately, and every
 * pipeline is recorded so tests can assert tenant scoping on the real query.
 */
const stubLedgers = (t, { facetRows = [] } = {}) => {
  const sinks = {
    bookingPipelines: [],
    bookingCounts: [],
    vehicleQueries: [],
  };

  const bookingModel = mongoose.model("Booking");
  const vehicleModel = mongoose.model("Vehicle");
  const companyModel = mongoose.model("Company");

  t.mock.method(bookingModel, "aggregate", (pipeline) => {
    sinks.bookingPipelines.push(pipeline);
    const isList = pipeline.some((stage) => stage.$lookup);
    if (isList) {
      return thenable([{ metadata: [{ total: facetRows.length }], rows: facetRows }]);
    }
    return thenable([
      { _id: "PENDING_PAYMENT", count: 8 },
      { _id: "CONFIRMED", count: 24 },
      { _id: "ACTIVE", count: 12 },
      { _id: "COMPLETED", count: 84 },
    ]);
  });

  t.mock.method(bookingModel, "countDocuments", (filter) => {
    sinks.bookingCounts.push(filter);
    return thenable(filter.bookingStatus?.$in?.includes("ACTIVE") ? 32 : 8);
  });

  t.mock.method(vehicleModel, "find", () => {
    sinks.vehicleQueries.push(1);
    return queryChain([{ _id: "ffffffffffffffffffffffff", make: "BMW", model: "520i", year: 2024, type: "LUXURY" }]);
  });

  t.mock.method(companyModel, "findById", () =>
    queryChain([{ id: companyA, name: "Fleet A", slug: "fleet-a" }]),
  );

  return sinks;
};

const invoke = (handler, req) =>
  new Promise((resolve) => {
    let statusCode = 200;
    let streamed = false;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        resolve({ statusCode, body });
        return this;
      },
      setHeader() {
        return this;
      },
      write() {
        streamed = true;
        return true;
      },
      end() {
        streamed = true;
        resolve({ statusCode, body: undefined, streamed });
      },
    };
    handler(req, res, (error) => {
      if (error) resolve({ error, streamed, statusCode });
      else resolve({ statusCode, body: undefined, streamed });
    });
  });

// ---------------------------------------------------------------------------
// Tenant scoping: a company session must stay pinned to its own tenant,
// exactly like the dashboard / payment / booking company endpoints.
// ---------------------------------------------------------------------------

test("company bookings cannot be pivoted with a forged ?companyId", async (t) => {
  const facetRows = [bookingRow()];
  const sinks = stubLedgers(t, { facetRows });

  const outcome = await invoke(getCompanyBookings, {
    user: companyUser(),
    tenantId: companyA,
    query: { companyId: companyB, search: "Ahmed", page: 1, limit: 10 },
  });

  assert.equal(outcome.statusCode, 200);
  const listPipeline = sinks.bookingPipelines.find((p) => p.some((s) => s.$lookup));
  assert.ok(listPipeline, "the list pipeline must run");
  const listMatch = listPipeline[0].$match;
  assert.equal(
    listMatch.companyId.toString(),
    companyA,
    "the register must stay pinned to tenant A despite ?companyId=B",
  );

  const summaryPipeline = sinks.bookingPipelines.find((p) => !p.some((s) => s.$lookup));
  assert.equal(summaryPipeline[0].$match.companyId.toString(), companyA);
  assert.equal(outcome.body.data.summary.total, 128);
});

test("company bookings fail closed for a tenant-less company session", async (t) => {
  const sinks = stubLedgers(t);

  const outcome = await invoke(getCompanyBookings, {
    user: { _id: customerA, id: customerA, role: "company" },
    tenantId: null,
    query: { companyId: companyB },
  });

  assert.ok(outcome.error, "a tenant-less company must be refused");
  assert.equal(outcome.error.statusCode, 403);
  assert.equal(sinks.bookingPipelines.length, 0, "no aggregation may run");
});

// ---------------------------------------------------------------------------
// Admin bypass + untargeted refusal
// ---------------------------------------------------------------------------

test("an admin may request another company's bookings via ?companyId", async (t) => {
  const facetRows = [bookingRow()];
  const sinks = stubLedgers(t, { facetRows });

  const outcome = await invoke(getCompanyBookings, {
    user: { _id: adminId, id: adminId, role: "admin" },
    tenantId: null,
    query: { companyId: companyB, page: 2, limit: 10 },
  });

  assert.equal(outcome.statusCode, 200);
  const listPipeline = sinks.bookingPipelines.find((p) => p.some((s) => s.$lookup));
  assert.equal(listPipeline[0].$match.companyId.toString(), companyB);
  assert.equal(outcome.body.data.pagination.page, 2);
});

test("an admin bookings request without a company target is refused", async (t) => {
  const sinks = stubLedgers(t);
  const outcome = await invoke(getCompanyBookings, {
    user: { _id: adminId, id: adminId, role: "admin" },
    tenantId: null,
    query: {},
  });
  assert.ok(outcome.error, "an untargeted admin request must be refused");
  assert.equal(outcome.error.statusCode, 400);
  assert.equal(sinks.bookingPipelines.length, 0, "no aggregation may run");
});

// ---------------------------------------------------------------------------
// Service-level guards + response mapping
// ---------------------------------------------------------------------------

test("invalid company identifiers are refused before any query", async () => {
  await assert.rejects(
    () => buildCompanyBookings({ companyId: "not-a-valid-object-id" }),
    (err) => err.statusCode === 400,
  );
});

test("the bookings page maps real ledgers into the drawer-ready row shape", async (t) => {
  const row = bookingRow();
  stubLedgers(t, { facetRows: [row] });
  const response = await buildCompanyBookings({
    companyId: companyA,
    search: "Ahmed",
    page: 1,
    limit: 10,
  });

  assert.equal(response.summary.total, 128);
  assert.equal(response.summary.confirmed, 24);
  assert.ok(response.vehicles.length >= 1);

  const mapped = response.list.find((b) => b.id === row._id.toString());
  assert.ok(mapped, "the row must be mapped from the ledger");
  assert.equal(mapped.reference, `NX-${row._id.slice(-6).toUpperCase()}`);
  assert.equal(mapped.payment, "PAID");
  assert.equal(mapped.channel, "delivery");
  assert.deepEqual(mapped.customer, {
    initials: "AA",
    name: "Ahmed Ali",
    phone: "+218 91 382 9910",
  });
  assert.equal(mapped.detail.payoutStatus, "UNSETTLED");
  assert.equal(mapped.detail.checks.find((c) => c.key === "ready").done, true);
  assert.equal(response.pagination.total, response.list.length);
});