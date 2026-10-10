import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import MaintenanceEvent from "../models/Maintenance_model.js";
import Vehicle from "../models/vehicle_model.js";
import Booking from "../models/booking_model.js";
import AppError from "../utils/appError.js";
import * as maintenanceService from "../services/maintenanceService.js";
import {
  getCompanyMaintenanceEvents,
  getCompanyMaintenanceSummary,
  createCompanyMaintenance,
  completeCompanyMaintenance,
  releaseCompanyMaintenanceVehicle,
} from "../controllers/companyMaintenanceController.js";

const vehicleId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const eventId = "cccccccccccccccccccccccc";
const companyA = "bbbbbbbbbbbbbbbbbbbbbbbb";
const companyB = "dddddddddddddddddddddddd";
const customerA = "eeeeeeeeeeeeeeeeeeeeeeee";
const adminId = "999999999999999999999999";

const companyUser = (overrides = {}) => ({
  _id: customerA,
  id: customerA,
  role: "company",
  company: companyA,
  ...overrides,
});

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
// Test doubles (mirror adminPagination.test.js so the real controller -> service
// -> runPaginatedQuery chain runs against in-memory query chain doubles).
// -----------------------------------------------------------------------------

/** A thenable that mirrors a Mongoose Query chain and records what was applied. */
const makeQuery = (docs, calls) => {
  const query = {
    find(filter) {
      calls.findFilter = { ...(calls.findFilter || {}), ...filter };
      return query;
    },
    sort(spec) {
      calls.sort = spec;
      return query;
    },
    select(spec) {
      calls.select = spec;
      return query;
    },
    skip(value) {
      calls.skip = value;
      return query;
    },
    limit(value) {
      calls.limit = value;
      return query;
    },
    populate(...args) {
      calls.populate = args;
      return query;
    },
    then(resolve, reject) {
      const skip = calls.skip ?? 0;
      const end = calls.limit === undefined ? undefined : skip + calls.limit;
      return Promise.resolve(docs.slice(skip, end)).then(resolve, reject);
    },
  };
  return query;
};

const stubModelQuery = (t, model, docs, sink = {}) => {
  t.mock.method(model, "find", (filter = {}) => {
    sink.findFilter = filter;
    return makeQuery(docs, sink);
  });
  t.mock.method(model, "countDocuments", async (filter = {}) => {
    sink.countFilter = filter;
    return docs.length;
  });
};

const maintenanceDoc = (overrides = {}) => ({
  _id: eventId,
  status: "SCHEDULED",
  estReturnDate: null,
  toObject() {
    return { _id: this._id, status: this.status, estReturnDate: this.estReturnDate };
  },
  ...overrides,
});

// ---------------------------------------------------------------------------
// Controller list scoping: a company session must stay pinned to its own tenant
// ---------------------------------------------------------------------------

test("company maintenance list cannot be pivoted with a forged ?companyId", async (t) => {
  const sink = {};
  stubModelQuery(t, MaintenanceEvent, [maintenanceDoc()], sink);

  const outcome = await invoke(getCompanyMaintenanceEvents, {
    user: companyUser(),
    tenantId: companyA,
    query: { companyId: companyB, status: "IN_PROGRESS", page: 2, limit: 20 },
  });

  assert.equal(outcome.statusCode, 200);
  assert.equal(
    String(sink.findFilter.companyId),
    companyA,
    "the ledger must stay pinned to tenant A despite ?companyId=B",
  );
  assert.equal(sink.findFilter.status, "IN_PROGRESS");
});

test("an admin may read another company's maintenance ledger via ?companyId", async (t) => {
  const sink = {};
  stubModelQuery(t, MaintenanceEvent, [maintenanceDoc()], sink);

  const outcome = await invoke(getCompanyMaintenanceEvents, {
    user: { _id: adminId, id: adminId, role: "admin" },
    tenantId: null,
    query: { companyId: companyB, page: 3, limit: 20 },
  });

  assert.equal(outcome.statusCode, 200);
  assert.equal(String(sink.findFilter.companyId), companyB);
  assert.equal(outcome.body.pagination.page, 3, "the requested page is preserved");
});

test("every company maintenance handler fails closed for a tenant-less session", async (t) => {
  const eventSink = {};
  stubModelQuery(t, MaintenanceEvent, [], eventSink);
  const findCalls = { count: 0, aggregate: 0, findById: 0 };
  t.mock.method(MaintenanceEvent, "aggregate", async () => {
    findCalls.aggregate += 1;
    return [];
  });
  t.mock.method(MaintenanceEvent, "findById", async () => null);
  const vehicleCalls = { count: 0, aggregate: 0, findById: 0 };
  t.mock.method(Vehicle, "countDocuments", async () => {
    vehicleCalls.count += 1;
    return 0;
  });
  t.mock.method(Vehicle, "aggregate", async () => {
    vehicleCalls.aggregate += 1;
    return [];
  });
  t.mock.method(Vehicle, "findById", async () => null);

  for (const handler of [
    getCompanyMaintenanceEvents,
    getCompanyMaintenanceSummary,
    createCompanyMaintenance,
    completeCompanyMaintenance,
    releaseCompanyMaintenanceVehicle,
  ]) {
    const outcome = await invoke(handler, {
      user: { _id: customerA, id: customerA, role: "company" },
      tenantId: null,
      query: {},
    });
    assert.ok(outcome.error, "a tenant-less company must be refused");
    assert.equal(outcome.error.statusCode, 403);
  }

  const ledgerQueries =
    Object.values(eventSink).filter((v) => v !== undefined).length +
    findCalls.aggregate +
    findCalls.findById;
  assert.equal(ledgerQueries, 0, "no event query may run");
  assert.equal(vehicleCalls.count + vehicleCalls.aggregate + vehicleCalls.findById, 0);
});

// ---------------------------------------------------------------------------
// Controller summary scoping
// ---------------------------------------------------------------------------

test("company maintenance summary is scoped to the tenant at the query layer", async (t) => {
  const counts = { vehicles: [], vehiclePipelines: [], eventPipelines: [], finds: [] };
  t.mock.method(Vehicle, "countDocuments", (filter) => {
    counts.vehicles.push(filter);
    return Promise.resolve(24);
  });
  t.mock.method(Vehicle, "aggregate", (pipeline) => {
    counts.vehiclePipelines.push(pipeline);
    return Promise.resolve([
      { _id: "AVAILABLE", count: 18 },
      { _id: "MAINTENANCE", count: 3 },
      { _id: "UNAVAILABLE", count: 1 },
    ]);
  });
  t.mock.method(MaintenanceEvent, "aggregate", (pipeline) => {
    counts.eventPipelines.push(pipeline);
    return Promise.resolve([
      {
        _id: null,
        inProgressEvents: 1,
        completed14d: 2,
        mtdCost: 1200,
        mtdVehicles: ["x"],
      },
    ]);
  });
  t.mock.method(MaintenanceEvent, "find", (filter) => {
    counts.finds.push(filter);
    return Promise.resolve([]);
  });

  const outcome = await invoke(getCompanyMaintenanceSummary, {
    user: companyUser(),
    tenantId: companyA,
    query: { companyId: companyB },
  });

  assert.equal(outcome.statusCode, 200);
  assert.equal(
    counts.vehicles[0].companyId.toString(),
    companyA,
    "summary must stay pinned to tenant A despite ?companyId=B",
  );
  assert.equal(
    counts.vehiclePipelines[0][0].$match.companyId.toString(),
    companyA,
  );
  assert.equal(counts.eventPipelines[0][0].$match.companyId.toString(), companyA);
  assert.equal(counts.finds[0].companyId.toString(), companyA);
  assert.equal(outcome.body.data.summary.totalFleet, 24);
  assert.equal(outcome.body.data.summary.inServicePct, 12.5);
});

// ---------------------------------------------------------------------------
// Service-level constructors: the tenant filter reaches every ledger query
// ---------------------------------------------------------------------------

test("buildMaintenanceSummary applies the tenant filter to every ledger query", async (t) => {
  const vehicleModel = mongoose.model("Vehicle");
  const maintenanceModel = mongoose.model("MaintenanceEvent");
  const calls = { counts: [], aggregates: [], finds: [] };

  t.mock.method(vehicleModel, "countDocuments", (filter) => {
    calls.counts.push(filter);
    return Promise.resolve(24);
  });
  t.mock.method(vehicleModel, "aggregate", (pipeline) => {
    calls.aggregates.push({ on: "vehicle", pipeline });
    return Promise.resolve([
      { _id: "AVAILABLE", count: 18 },
      { _id: "MAINTENANCE", count: 3 },
      { _id: "UNAVAILABLE", count: 1 },
    ]);
  });
  t.mock.method(maintenanceModel, "aggregate", (pipeline) => {
    calls.aggregates.push({ on: "event", pipeline });
    return Promise.resolve([
      {
        _id: null,
        inProgressEvents: 1,
        completed14d: 2,
        mtdCost: 1200,
        mtdVehicles: ["x"],
      },
    ]);
  });
  t.mock.method(maintenanceModel, "find", (filter) => {
    calls.finds.push(filter);
    return Promise.resolve([]);
  });

  const summary = await maintenanceService.buildMaintenanceSummary(companyA);

  assert.equal(calls.counts[0].companyId.toString(), companyA);
  const vehiclePipeline = calls.aggregates.find((c) => c.on === "vehicle").pipeline;
  assert.equal(vehiclePipeline[0].$match.companyId.toString(), companyA);
  const eventPipeline = calls.aggregates.find((c) => c.on === "event").pipeline;
  assert.equal(eventPipeline[0].$match.companyId.toString(), companyA);
  assert.equal(calls.finds[0].companyId.toString(), companyA);

  assert.equal(summary.totalFleet, 24);
  assert.equal(summary.inServiceVehicles, 3);
  assert.equal(summary.inServicePct, 12.5);
});

test("buildMaintenanceSummary stays platform-wide without a tenant", async (t) => {
  const vehicleModel = mongoose.model("Vehicle");
  const maintenanceModel = mongoose.model("MaintenanceEvent");
  const calls = { counts: [], aggregates: [], finds: [] };

  t.mock.method(vehicleModel, "countDocuments", (filter) => {
    calls.counts.push(filter);
    return Promise.resolve(24);
  });
  t.mock.method(vehicleModel, "aggregate", (pipeline) => {
    calls.aggregates.push({ on: "vehicle", pipeline });
    return Promise.resolve([]);
  });
  t.mock.method(maintenanceModel, "aggregate", (pipeline) => {
    calls.aggregates.push({ on: "event", pipeline });
    return Promise.resolve([]);
  });
  t.mock.method(maintenanceModel, "find", (filter) => {
    calls.finds.push(filter);
    return Promise.resolve([]);
  });

  await maintenanceService.buildMaintenanceSummary();

  assert.deepEqual(calls.counts[0], {}, "global deck has no tenant filter");
  assert.equal(calls.aggregates[0].pipeline[0].$match, undefined);
  assert.equal(calls.aggregates[1].pipeline[0].$match, undefined);
  assert.equal(calls.finds[0].companyId, undefined);
});

// ---------------------------------------------------------------------------
// Service-level write guards: a company can only ever touch its own units
// ---------------------------------------------------------------------------

test("creating maintenance on another tenant's vehicle is refused", async (t) => {
  t.mock.method(Vehicle, "findById", async () => ({
    _id: vehicleId,
    companyId: companyB,
    operationalStatus: "AVAILABLE",
    async save() {},
  }));

  await assert.rejects(
    maintenanceService.createMaintenanceEvent({ vehicleId }, customerA, companyA),
    (error) => error instanceof AppError && error.statusCode === 404,
  );
});

test("creating maintenance on the tenant's own vehicle is allowed", async (t) => {
  const vehicle = {
    _id: vehicleId,
    companyId: companyA,
    operationalStatus: "AVAILABLE",
    async save() {},
  };
  const event = {
    _id: eventId,
    companyId: companyA,
    status: "SCHEDULED",
    toObject() {
      return { ...this };
    },
  };
  t.mock.method(Vehicle, "findById", async () => vehicle);
  t.mock.method(Booking, "find", async () => []);
  t.mock.method(MaintenanceEvent, "create", async () => event);
  t.mock.method(MaintenanceEvent, "findById", () => ({
    populate() {
      return this;
    },
    then(resolve) {
      resolve({ ...event, toObject: () => ({ ...event }) });
    },
  }));

  const result = await maintenanceService.createMaintenanceEvent(
    {
      vehicleId,
      category: "OIL_FILTER",
      status: "SCHEDULED",
      triggerReason: "x",
      estCost: 80,
    },
    customerA,
    companyA,
  );

  assert.equal(vehicle.operationalStatus, "MAINTENANCE");
  assert.equal(result.companyId, companyA);
});

test("completing another tenant's event is refused", async (t) => {
  t.mock.method(MaintenanceEvent, "findById", async () => ({
    _id: eventId,
    companyId: companyB,
    status: "SCHEDULED",
  }));

  await assert.rejects(
    maintenanceService.completeMaintenanceEvent(eventId, companyA),
    (error) => error instanceof AppError && error.statusCode === 404,
  );
});

test("releasing another tenant's vehicle is refused", async (t) => {
  t.mock.method(Vehicle, "findById", async () => ({
    _id: vehicleId,
    companyId: companyB,
    operationalStatus: "MAINTENANCE",
  }));

  await assert.rejects(
    maintenanceService.releaseVehicleFromQuarantine(vehicleId, companyA),
    (error) => error instanceof AppError && error.statusCode === 404,
  );
});