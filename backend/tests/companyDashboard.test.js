import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import { getCompanyDashboard } from "../controllers/companyDashboardController.js";
import { buildCompanyDashboard } from "../services/companyDashboardService.js";

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

/** Minimal mongoose-style chain that every dashboard query can hang off. */
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

/**
 * Stubs every ledger the dashboard service touches so the controller/resolver
 * can be exercised without a database. Each pipeline is recorded so tests can
 * assert tenant scoping on the real aggregation, not just the return value.
 */
const stubLedgers = (t) => {
  const sinks = { paymentPipelines: [], bookingPipelines: [], vehiclePipelines: [] };

  const vehicleModel = mongoose.model("Vehicle");
  const bookingModel = mongoose.model("Booking");
  const paymentModel = mongoose.model("Payment");
  const companyModel = mongoose.model("Company");

  t.mock.method(companyModel, "findById", () => queryChain([{ id: companyA, name: "Fleet A" }]));

  t.mock.method(vehicleModel, "aggregate", (pipeline) => {
    sinks.vehiclePipelines.push(pipeline);
    return thenable([]);
  });
  t.mock.method(vehicleModel, "find", () => queryChain([]));

  t.mock.method(bookingModel, "aggregate", (pipeline) => {
    sinks.bookingPipelines.push(pipeline);
    return thenable([]);
  });
  t.mock.method(bookingModel, "find", () => queryChain([]));
  t.mock.method(bookingModel, "countDocuments", () => thenable(0));

  t.mock.method(paymentModel, "aggregate", (pipeline) => {
    sinks.paymentPipelines.push(pipeline);
    return thenable([]);
  });
  t.mock.method(paymentModel, "find", () => queryChain([]));

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
// Tenant scoping: a company session must stay pinned to its own tenant, exactly
// like the payment / booking / vehicle company endpoints.
// ---------------------------------------------------------------------------

test("company dashboard cannot be pivoted with a forged ?companyId", async (t) => {
  const sinks = stubLedgers(t);

  const outcome = await invoke(getCompanyDashboard, {
    user: companyUser(),
    tenantId: companyA,
    query: { companyId: companyB, period: "30d" },
  });

  assert.equal(outcome.statusCode, 200);
  assert.ok(sinks.paymentPipelines.length > 0, "a payment aggregation must run");
  const match = sinks.paymentPipelines[0][0].$match;
  assert.equal(
    match.companyId.toString(),
    companyA,
    "the dashboard must stay pinned to tenant A despite ?companyId=B",
  );
});

test("company dashboard fails closed for a tenant-less company session", async (t) => {
  const sinks = stubLedgers(t);

  const outcome = await invoke(getCompanyDashboard, {
    user: { _id: customerA, id: customerA, role: "company" },
    tenantId: null,
    query: { companyId: companyB },
  });

  assert.ok(outcome.error, "a tenant-less company must be refused");
  assert.equal(outcome.error.statusCode, 403);
  assert.equal(sinks.paymentPipelines.length, 0, "no aggregation may run");
});

// ---------------------------------------------------------------------------
// Admin bypass
// ---------------------------------------------------------------------------

test("an admin may request another company's dashboard via ?companyId", async (t) => {
  const sinks = stubLedgers(t);

  const outcome = await invoke(getCompanyDashboard, {
    user: { _id: adminId, id: adminId, role: "admin" },
    tenantId: null,
    query: { companyId: companyB, period: "12m" },
  });

  assert.equal(outcome.statusCode, 200);
  assert.ok(sinks.paymentPipelines.length > 0);
  const match = sinks.paymentPipelines[0][0].$match;
  assert.equal(match.companyId.toString(), companyB);
});

test("an admin dashboard without a company target is refused", async (t) => {
  const sinks = stubLedgers(t);
  const outcome = await invoke(getCompanyDashboard, {
    user: { _id: adminId, id: adminId, role: "admin" },
    tenantId: null,
    query: {},
  });
  assert.ok(outcome.error, "an untargeted admin dashboard must be refused");
  assert.equal(outcome.error.statusCode, 400);
  assert.equal(sinks.paymentPipelines.length, 0, "no aggregation may run");
});

test("invalid company identifiers are refused before any query", async () => {
  await assert.rejects(
    () => buildCompanyDashboard({ companyId: "not-a-valid-object-id" }),
    (err) => err.statusCode === 400,
  );
});