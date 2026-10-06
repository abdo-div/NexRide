import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import { getCompanyFleet } from "../controllers/companyFleetController.js";
import { buildCompanyFleet } from "../services/companyFleetService.js";

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

const thenable = (value) => ({ then: (resolve) => resolve(value) });

/** Realistic vehicle row the mapper has to digest after filters + $addFields. */
const vehicleRow = (overrides = {}) => ({
  _id: "ffffffffffffffffffffffff",
  make: "BMW",
  model: "520i",
  year: 2024,
  type: "LUXURY",
  transmission: "AUTOMATIC",
  fuelType: "GASOLINE",
  dailyPrice: 380,
  weeklyPrice: 2400,
  city: "Tripoli",
  pickupLocation: "Tripoli Central Depot",
  listingStatus: "PUBLISHED",
  operationalStatus: "AVAILABLE",
  ratingsAverage: 4.8,
  ratingsQuantity: 32,
  location: { type: "Point", coordinates: [13.18, 32.88] },
  photos: ["https://example.com/bmw-520i.jpg"],
  createdAt: new Date("2026-09-20T10:00:00.000Z"),
  ...overrides,
});

/**
 * Stubs every ledger the fleet service touches so the controller/service can be
 * exercised without a database. The deck group, the paginated $facet list and
 * the completed-rides tally are answered separately, and every pipeline is
 * recorded so tests can assert tenant scoping on the real query.
 */
const stubLedgers = (
  t,
  { facetRows = [], onRoadVehicles = [], ridesTotal = 18 } = {},
) => {
  const sinks = {
    vehiclePipelines: [],
    bookingPipelines: [],
  };

  const vehicleModel = mongoose.model("Vehicle");
  const bookingModel = mongoose.model("Booking");
  const companyModel = mongoose.model("Company");

  t.mock.method(vehicleModel, "aggregate", (pipeline) => {
    sinks.vehiclePipelines.push(pipeline);
    if (pipeline.some((stage) => stage.$facet)) {
      return thenable([
        { count: [{ total: facetRows.length }], rows: facetRows },
      ]);
    }
    if (pipeline.some((stage) => stage.$group && stage.$group.rented)) {
      return thenable([
        { _id: null, total: 4, rented: 1, maintenance: 1, draft: 1, published: 3 },
      ]);
    }
    return thenable([]);
  });

  t.mock.method(bookingModel, "aggregate", (pipeline) => {
    sinks.bookingPipelines.push(pipeline);
    const match = pipeline[0]?.$match ?? {};
    if (match.bookingStatus === "COMPLETED") {
      return thenable([{ _id: facetRows[0]?._id, rides: ridesTotal }]);
    }
    return thenable(onRoadVehicles.map((id) => ({ _id: id })));
  });

  t.mock.method(companyModel, "findById", () => ({
    select() {
      return this;
    },
    then(resolve) {
      resolve({ _id: companyA, name: "Fleet A", slug: "fleet-a", city: "Tripoli" });
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
// Tenant scoping: a company session must stay pinned to its own tenant,
// exactly like the dashboard / bookings company endpoints.
// ---------------------------------------------------------------------------

test("company fleet cannot be pivoted with a forged ?companyId", async (t) => {
  const facetRows = [vehicleRow()];
  const sinks = stubLedgers(t, { facetRows });

  const outcome = await invoke(getCompanyFleet, {
    user: companyUser(),
    tenantId: companyA,
    query: { companyId: companyB, search: "BMW", page: 1, limit: 7 },
  });

  assert.equal(outcome.statusCode, 200);
  assert.ok(
    sinks.vehiclePipelines.length >= 2,
    "deck + list pipelines must run",
  );
  const listPipeline = sinks.vehiclePipelines.find((p) => p.some((s) => s.$facet));
  assert.equal(
    listPipeline[0].$match.companyId.toString(),
    companyA,
    "the register must stay pinned to tenant A despite ?companyId=B",
  );
  const deckPipeline = sinks.vehiclePipelines.find((p) => !p.some((s) => s.$facet));
  assert.equal(deckPipeline[0].$match.companyId.toString(), companyA);
  assert.equal(outcome.body.data.summary.total, 4);
  assert.equal(outcome.body.data.summary.available, 1);
});

test("company fleet fails closed for a tenant-less company session", async (t) => {
  const sinks = stubLedgers(t);

  const outcome = await invoke(getCompanyFleet, {
    user: { _id: customerA, id: customerA, role: "company" },
    tenantId: null,
    query: { companyId: companyB },
  });

  assert.ok(outcome.error, "a tenant-less company must be refused");
  assert.equal(outcome.error.statusCode, 403);
  assert.equal(sinks.vehiclePipelines.length, 0, "no aggregation may run");
});

// ---------------------------------------------------------------------------
// Admin bypass + untargeted refusal
// ---------------------------------------------------------------------------

test("an admin may request another company's fleet via ?companyId", async (t) => {
  const facetRows = [vehicleRow()];
  const sinks = stubLedgers(t, { facetRows });

  const outcome = await invoke(getCompanyFleet, {
    user: { _id: adminId, id: adminId, role: "admin" },
    tenantId: null,
    query: { companyId: companyB, page: 2, limit: 7 },
  });

  assert.equal(outcome.statusCode, 200);
  const listPipeline = sinks.vehiclePipelines.find((p) => p.some((s) => s.$facet));
  assert.equal(listPipeline[0].$match.companyId.toString(), companyB);
  assert.equal(outcome.body.data.pagination.page, 2);
});

test("an admin fleet request without a company target is refused", async (t) => {
  const sinks = stubLedgers(t);
  const outcome = await invoke(getCompanyFleet, {
    user: { _id: adminId, id: adminId, role: "admin" },
    tenantId: null,
    query: {},
  });
  assert.ok(outcome.error, "an untargeted admin request must be refused");
  assert.equal(outcome.error.statusCode, 400);
  assert.equal(sinks.vehiclePipelines.length, 0, "no aggregation may run");
});

// ---------------------------------------------------------------------------
// Service-level guards + response mapping
// ---------------------------------------------------------------------------

test("invalid company identifiers are refused before any query", async () => {
  await assert.rejects(
    () => buildCompanyFleet({ companyId: "not-a-valid-object-id" }),
    (err) => err.statusCode === 400,
  );
});

test("the fleet page maps real vehicles into the register row shape", async (t) => {
  const row = vehicleRow();
  stubLedgers(t, { facetRows: [row] });
  const response = await buildCompanyFleet({
    companyId: companyA,
    search: "BMW",
    page: 1,
    limit: 7,
  });

  assert.equal(response.company.code, "#fleet-a");
  assert.equal(response.summary.total, 4);
  assert.equal(response.summary.rented, 1);
  assert.equal(response.summary.maintenance, 1);
  assert.equal(response.summary.draft, 1);

  const mapped = response.list.find((v) => v.id === row._id.toString());
  assert.ok(mapped, "the row must be mapped from the ledger");
  assert.equal(mapped.code, `NR-VH-${row._id.slice(-5).toUpperCase()}`);
  assert.equal(mapped.make, "BMW");
  assert.equal(mapped.displayStatus, "available");
  assert.equal(mapped.bookings, 18);
  assert.equal(mapped.dailyPrice, 380);
  assert.equal(mapped.weeklyPrice, 2400);
  assert.equal(mapped.gpsActive, true);
  assert.deepEqual(mapped.rating, { average: 4.8, count: 32 });
  assert.equal(mapped.photo, "https://example.com/bmw-520i.jpg");
  assert.equal(response.pagination.total, response.list.length);
});

test("the status filter buckets vehicles by the on-road classification", async (t) => {
  const row = vehicleRow({ _onRoad: true });
  stubLedgers(t, { facetRows: [row] });
  const response = await buildCompanyFleet({
    companyId: companyA,
    status: "rented",
    page: 1,
    limit: 7,
  });

  const mapped = response.list.find((v) => v.id === row._id.toString());
  assert.equal(mapped.displayStatus, "rented");
});