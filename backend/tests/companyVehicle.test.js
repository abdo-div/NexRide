import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import { getCompanyVehicleDetail } from "../controllers/companyVehicleController.js";
import { buildCompanyVehicleDetail } from "../services/companyVehicleService.js";

const customerA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const companyA = "cccccccccccccccccccccccc";
const companyB = "dddddddddddddddddddddddd";
const vehicleA = "eeeeeeeeeeeeeeeeeeeeeeee";
const vehicleB = "ffffffffffffffffffffffff";
const adminId = "999999999999999999999999";

const companyUser = (overrides = {}) => ({
  _id: customerA,
  id: customerA,
  role: "company",
  company: companyA,
  ...overrides,
});

const thenable = (value) => ({ then: (resolve) => resolve(value) });

const chain = (value) => ({
  select() {
    return this;
  },
  lean() {
    return this;
  },
  then(resolve) {
    resolve(value);
  },
});

const makeBooking = (overrides = {}) => ({
  _id: "bbbbbbbbbbbbbbbbbbbbbbbb",
  bookingStatus: "COMPLETED",
  startDate: new Date("2026-09-24T10:00:00.000Z"),
  endDate: new Date("2026-09-28T10:00:00.000Z"),
  totalDays: 4,
  totalAmount: 1800,
  ...overrides,
});

/** Eyes on every ledgers query the dossier service touches. */
const stubLedgers = (t, { vehicle, ledger = [], facetRows = [], facetTotal } = {}) => {
  const sinks = {
    vehicleFindFilters: [],
    bookingFindFilters: [],
    aggregatePipelines: [],
  };

  const vehicleModel = mongoose.model("Vehicle");
  const bookingModel = mongoose.model("Booking");
  const companyModel = mongoose.model("Company");

  t.mock.method(vehicleModel, "findOne", (filter) => {
    sinks.vehicleFindFilters.push(filter);
    return chain(vehicle);
  });

  t.mock.method(companyModel, "findById", () => chain({ _id: companyA, name: "Fleet A", slug: "fleet-a", city: "Tripoli" }));

  t.mock.method(bookingModel, "find", (filter) => {
    sinks.bookingFindFilters.push(filter);
    return chain(ledger);
  });

  t.mock.method(bookingModel, "aggregate", (pipeline) => {
    sinks.aggregatePipelines.push(pipeline);
    if (pipeline.some((stage) => stage.$facet)) {
      return thenable([
        {
          metadata: [{ total: facetTotal ?? facetRows.length }],
          rows: facetRows,
        },
      ]);
    }
    // Enriched customer names for the ledger (users $lookup).
    return thenable(
      ledger.map((b) => ({ _id: b._id, customerName: b._customerName ?? null })),
    );
  });

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
// Tenant scoping
// ---------------------------------------------------------------------------

test("a company cannot read another operator's vehicle by guessing its id", async (t) => {
  stubLedgers(t, { vehicle: null });

  const outcome = await invoke(getCompanyVehicleDetail, {
    user: companyUser(),
    tenantId: companyA,
    query: { companyId: vehicleB },
    params: { vehicleId: vehicleB },
  });

  assert.ok(outcome.error, "a cross-tenant vehicle read must be refused");
  assert.equal(outcome.error.statusCode, 404);
});

test("vehicle dossier fails closed for a tenant-less company session", async (t) => {
  const sinks = stubLedgers(t, { vehicle: null });
  const outcome = await invoke(getCompanyVehicleDetail, {
    user: { _id: customerA, id: customerA, role: "company" },
    tenantId: null,
    query: {},
    params: { vehicleId: vehicleA },
  });

  assert.ok(outcome.error, "a tenant-less company must be refused");
  assert.equal(outcome.error.statusCode, 403);
  assert.equal(sinks.vehicleFindFilters.length, 0, "no vehicle query may run");
});

test("an admin may open another company's vehicle via ?companyId", async (t) => {
  const vehicle = {
    _id: vehicleB,
    make: "BMW",
    model: "520i",
    year: 2024,
    type: "LUXURY",
    transmission: "AUTOMATIC",
    fuelType: "GASOLINE",
    seats: 5,
    doors: 4,
    dailyPrice: 350,
    weeklyPrice: 2400,
    city: "Tripoli",
    pickupLocation: "Tripoli Central Depot",
    operationalStatus: "AVAILABLE",
    listingStatus: "PUBLISHED",
    ratingsAverage: 4.8,
    ratingsQuantity: 32,
    location: { type: "Point", coordinates: [13.18, 32.88] },
    photos: [],
    createdAt: new Date("2026-09-20T10:00:00.000Z"),
  };
  const sinks = stubLedgers(t, { vehicle });

  const outcome = await invoke(getCompanyVehicleDetail, {
    user: { _id: adminId, id: adminId, role: "admin" },
    tenantId: null,
    query: { companyId: companyB },
    params: { vehicleId: vehicleB },
  });

  assert.equal(outcome.statusCode, 200);
  assert.equal(
    String(sinks.vehicleFindFilters[0].companyId),
    companyB,
    "the vehicle lookup must be scoped to the admin-targeted tenant",
  );
});

// ---------------------------------------------------------------------------
// Service guards
// ---------------------------------------------------------------------------

test("malformed identifiers are refused before any query", async () => {
  await assert.rejects(
    () => buildCompanyVehicleDetail({ companyId: "nope", vehicleId: vehicleA }),
    (err) => err.statusCode === 400,
  );
  await assert.rejects(
    () => buildCompanyVehicleDetail({ companyId: companyA, vehicleId: "nope" }),
    (err) => err.statusCode === 400,
  );
});

// ---------------------------------------------------------------------------
// Response mapping (real ledgers only)
// ---------------------------------------------------------------------------

test("the vehicle dossier maps specs, ledger metrics, calendar and trips", async (t) => {
  const vehicle = {
    _id: vehicleA,
    make: "BMW",
    model: "520i",
    year: 2024,
    type: "LUXURY",
    transmission: "AUTOMATIC",
    fuelType: "GASOLINE",
    seats: 5,
    doors: 4,
    dailyPrice: 350,
    weeklyPrice: 2400,
    city: "Tripoli",
    pickupLocation: "Tripoli Central Depot",
    operationalStatus: "AVAILABLE",
    listingStatus: "PUBLISHED",
    ratingsAverage: 4.8,
    ratingsQuantity: 32,
    location: { type: "Point", coordinates: [13.18, 32.88] },
    photos: ["https://example.com/front.jpg"],
    description: "Premium executive sedan.",
    createdAt: new Date("2026-09-20T10:00:00.000Z"),
  };

  const ledger = [
    makeBooking({ _id: "b1b1b1b1b1b1b1b1b1b1b1", _customerName: "Sara Mohamed" }),
    makeBooking({
      _id: "b2b2b2b2b2b2b2b2b2b2b2",
      bookingStatus: "CONFIRMED",
      startDate: new Date("2026-10-08T10:00:00.000Z"),
      endDate: new Date("2026-10-12T10:00:00.000Z"),
      totalDays: 4,
      totalAmount: 2400,
      _customerName: "Ahmed Ali",
    }),
    makeBooking({
      _id: "b3b3b3b3b3b3b3b3b3b3b3",
      bookingStatus: "PENDING_PAYMENT",
      startDate: new Date("2026-10-17T10:00:00.000Z"),
      endDate: new Date("2026-10-20T10:00:00.000Z"),
      totalDays: 3,
      totalAmount: 1350,
      _customerName: "Omar Khaled",
    }),
  ];

  const facetRows = [
    {
      _id: ledger[1]._id,
      bookingStatus: "CONFIRMED",
      paymentStatus: "UNPAID",
      pickupMethod: "BRANCH_PICKUP",
      pickupLocation: "Tripoli Central Depot",
      startDate: ledger[1].startDate,
      endDate: ledger[1].endDate,
      totalDays: 4,
      totalAmount: 2400,
      customer: { name: "Ahmed Ali", phoneNumber: "+218 91 382 9910" },
      payments: [
        { status: "COMPLETED", paymentMethod: "MOAMALAT", createdAt: new Date() },
      ],
      resolvedPayment: "PAID",
    },
  ];

  stubLedgers(t, { vehicle, ledger, facetRows });

  const response = await buildCompanyVehicleDetail({
    companyId: companyA,
    vehicleId: vehicleA,
    page: 1,
    limit: 8,
  });

  assert.equal(response.vehicle.code, `NR-VH-${vehicleA.slice(-5).toUpperCase()}`);
  assert.equal(response.vehicle.displayStatus, "available");
  assert.equal(response.vehicle.doors, 4);
  assert.equal(response.company.code, "#fleet-a");

  assert.deepEqual(response.metrics.bookings, { total: 3, completed: 1, upcoming: 2 });
  assert.equal(response.metrics.financial.revenue, 5550);
  assert.equal(response.metrics.rentalDays, 11);
  assert.ok(response.metrics.utilization.daysRented >= 5);

  const booked = response.calendar.bookedDates.filter((d) => d.kind === "booked");
  const pending = response.calendar.bookedDates.filter((d) => d.kind === "pending");
  assert.ok(booked.some((d) => d.date === "2026-10-08"), "Oct 8 must be marked booked");
  assert.ok(pending.some((d) => d.date === "2026-10-17"), "Oct 17 must be pending payment");

  assert.equal(response.nextDispatch.reference, "NX-B2B2B2");
  assert.equal(response.nextDispatch.customerName, "Ahmed Ali");

  assert.equal(response.trips.list.length, 1);
  const trip = response.trips.list[0];
  assert.equal(trip.reference, "NX-B2B2B2");
  assert.equal(trip.channel, "moamalat");
  assert.equal(trip.service.delivery, false);
  assert.equal(trip.payment, "PAID");
  assert.equal(trip.bookingStatus, "CONFIRMED");
  assert.equal(response.trips.pagination.total, 1);
});

test("a permanently off-road or draft unit reports its display state", async (t) => {
  const vehicle = {
    _id: vehicleA,
    make: "Toyota",
    model: "Corolla",
    year: 2023,
    type: "SEDAN",
    transmission: "AUTOMATIC",
    fuelType: "GASOLINE",
    seats: 5,
    doors: 4,
    dailyPrice: 200,
    weeklyPrice: null,
    city: "Tripoli",
    pickupLocation: "Branch 2",
    operationalStatus: "MAINTENANCE",
    listingStatus: "DRAFT",
    location: null,
    photos: [],
    createdAt: new Date(),
  };
  stubLedgers(t, { vehicle, ledger: [] });

  const response = await buildCompanyVehicleDetail({
    companyId: companyA,
    vehicleId: vehicleA,
  });

  assert.equal(response.vehicle.displayStatus, "maintenance");
  assert.equal(response.vehicle.gpsActive, false);
  assert.equal(response.vehicle.weeklyPrice, null);
  assert.equal(response.nextDispatch, null);
});