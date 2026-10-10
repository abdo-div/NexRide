import assert from "node:assert/strict";
import { test } from "node:test";
import Company from "../models/Company_model.js";
import Vehicle from "../models/vehicle_model.js";
import { getCompanySettings } from "../controllers/companyController.js";

const companyA = "bbbbbbbbbbbbbbbbbbbbbbbb";
const companyB = "dddddddddddddddddddddddd";
const customerA = "eeeeeeeeeeeeeeeeeeeeeeee";
const adminId = "999999999999999999999999";

const companyDoc = {
  _id: companyA,
  name: "NexRide Rentals",
  subdomain: "nexride-rentals",
  slug: "nexride-rentals",
  description: "Premium fleet in Tripoli.",
  logo: "default-company-logo.png",
  email: "ops@nexride.ly",
  phone: "+218 91 000 0000",
  city: "Tripoli",
  address: "Souk Al-Jumaa, Tripoli",
  commercialRegisterNumber: "CR-2021-4471",
  status: "APPROVED",
  approvedAt: new Date("2025-01-01T00:00:00.000Z"),
  createdAt: new Date("2024-11-01T00:00:00.000Z"),
  customCommissionRate: 8,
};

/** A thenable that mirrors the Company.findById(...).select(...) chain. */
const stubCompanyLookup = (t, doc, sink = {}) => {
  t.mock.method(Company, "findById", (id) => {
    sink.findById = id;
    return {
      select(spec) {
        sink.select = spec;
        return Promise.resolve(doc);
      },
    };
  });
};

const fleetReport = (overrides = {}) => ({
  posture: [{ total: 3, published: 2 }],
  hubs: [
    { _id: "Tripoli Hub", city: "Tripoli", vehicles: 2 },
    { _id: "Airport Pickup", city: "Tripoli", vehicles: 1 },
  ],
  ...overrides,
});

const stubFleetReport = (t, report, sink = {}) => {
  t.mock.method(Vehicle, "aggregate", async (pipeline) => {
    sink.pipeline = pipeline;
    return [report];
  });
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

// -----------------------------------------------------------------------------
// Tenant scoping: a company session must stay pinned to its own tenant
// -----------------------------------------------------------------------------

test("settings for a company session stay pinned to the session tenant", async (t) => {
  const sink = {};
  stubCompanyLookup(t, companyDoc, sink);
  stubFleetReport(t, fleetReport(), sink);

  const outcome = await invoke(getCompanySettings, {
    user: { _id: customerA, id: customerA, role: "company", company: companyA },
    tenantId: companyA,
    query: { companyId: companyB }, // forged — must be ignored
  });

  assert.equal(outcome.statusCode, 200);
  assert.equal(sink.findById, companyA);
  assert.equal(sink.select, "+commercialRegisterNumber +deletedAt");

  const settings = outcome.body.data.settings;
  assert.equal(settings.profile._id, companyA);
  assert.equal(settings.profile.commercialRegisterNumber, "CR-2021-4471");
  assert.equal(settings.readiness.verified, true);
  assert.equal(settings.readiness.completeness, 100);
  assert.equal(settings.readiness.fleet, 3);
  assert.equal(settings.readiness.published, 2);
  assert.equal(settings.readiness.hubs, 2);
  assert.equal(settings.hubs.length, 2);
  assert.equal(settings.hubs[0].name, "Tripoli Hub");
  assert.equal(settings.hubs[0].primary, true);
  assert.equal(settings.hubs[0].vehicles, 2);
  assert.equal(settings.hubs[1].primary, false);
});

test("an admin may load settings for another company via ?companyId", async (t) => {
  const sink = {};
  stubCompanyLookup(t, companyDoc, sink);
  stubFleetReport(t, fleetReport(), sink);

  const outcome = await invoke(getCompanySettings, {
    user: { _id: adminId, id: adminId, role: "admin", company: null },
    tenantId: undefined,
    query: { companyId: companyB },
  });

  assert.equal(outcome.statusCode, 200);
  assert.equal(sink.findById, companyB);
});

test("a company session without a linked tenant is rejected with 403", async (t) => {
  const sink = {};
  t.mock.method(Company, "findById", (id) => {
    sink.findById = id;
    return { select: () => Promise.reject(new Error("must not run")) };
  });

  const outcome = await invoke(getCompanySettings, {
    user: { _id: customerA, id: customerA, role: "company" },
    tenantId: undefined,
    query: {},
  });

  assert.equal(sink.findById, undefined);
  assert.equal(outcome.error.statusCode, 403);
});

test("a missing company document yields 404 and skips fleet derivation", async (t) => {
  const sink = {};
  stubCompanyLookup(t, null, sink);
  stubFleetReport(t, fleetReport(), sink);

  const outcome = await invoke(getCompanySettings, {
    user: { _id: customerA, id: customerA, role: "company", company: companyA },
    tenantId: companyA,
    query: {},
  });

  assert.equal(outcome.error.statusCode, 404);
});

// -----------------------------------------------------------------------------
// Readiness derivation honesty: partial profiles and empty fleets
// -----------------------------------------------------------------------------

test("readiness reflects a partial profile and an empty fleet", async (t) => {
  const partial = { ...companyDoc, description: "", logo: "", status: "PENDING" };
  stubCompanyLookup(t, partial);
  stubFleetReport(t, { posture: [], hubs: [] });

  const outcome = await invoke(getCompanySettings, {
    user: { _id: customerA, id: customerA, role: "company", company: companyA },
    tenantId: companyA,
    query: {},
  });

  assert.equal(outcome.statusCode, 200);
  const settings = outcome.body.data.settings;
  assert.equal(settings.readiness.verified, false);
  assert.equal(settings.readiness.completeness, 71); // 5 / 7 core fields filled
  assert.equal(settings.readiness.fleet, 0);
  assert.equal(settings.readiness.hubs, 0);
  assert.deepEqual(settings.hubs, []);
});

test("the fleet facet is scoped to the tenant and excludes soft-deleted units", async (t) => {
  const sink = {};
  stubCompanyLookup(t, companyDoc, sink);
  stubFleetReport(t, fleetReport(), sink);

  await invoke(getCompanySettings, {
    user: { _id: customerA, id: customerA, role: "company", company: companyA },
    tenantId: companyA,
    query: {},
  });

  const match = sink.pipeline[0].$match;
  assert.equal(String(match.companyId), companyA);
  assert.equal(match.deletedAt, null);
});