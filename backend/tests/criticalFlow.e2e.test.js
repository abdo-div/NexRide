import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET ??= "nexride-e2e-test-secret-that-is-at-least-32-bytes";
process.env.FRONTEND_URL ??= "http://localhost:5173";
process.env.REDIS_ENABLED = "false";

// Explicit opt-in for local integration runs. The isolated dbName below keeps
// this test away from the application's normal collections even when it reuses
// the developer connection credentials from config.env/.env.
if (process.env.INTEGRATION_USE_APP_MONGO === "true") {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const backendDir = path.resolve(testDir, "..");
  const envFile = [
    path.join(backendDir, "config.env"),
    path.join(backendDir, ".env"),
    path.join(backendDir, "..", ".env"),
  ].find((candidate) => fs.existsSync(candidate));
  if (envFile) dotenv.config({ path: envFile });
}

const TEST_URI =
  process.env.TEST_MONGODB_URI ??
  process.env.MONGODB_URI ??
  process.env.MONGO_URI ??
  process.env.DATABASE_URI ??
  process.env.DATABASE_URL ??
  process.env.DATABASE ??
  "mongodb://127.0.0.1:27017/nexride?replicaSet=rs0";
const DB_NAME = "nexride_critical_flow_e2e";

let app;
let User;
let Company;
let Vehicle;
let Booking;
let Payment;
let server;
let baseUrl;
let connected = false;
let transactionCapable = false;

try {
  await mongoose.connect(TEST_URI, {
    dbName: DB_NAME,
    serverSelectionTimeoutMS: 4000,
  });
  connected = true;
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  transactionCapable = Boolean(hello.setName || hello.msg === "isdbgrid");

  ({ default: app } = await import("../app.js"));
  ({ default: User } = await import("../models/User_model.js"));
  ({ default: Company } = await import("../models/Company_model.js"));
  ({ default: Vehicle } = await import("../models/vehicle_model.js"));
  ({ default: Booking } = await import("../models/booking_model.js"));
  ({ default: Payment } = await import("../models/payment_model.js"));
} catch {
  connected = false;
}

const unavailable =
  connected ? false : "requires a reachable MongoDB";

// Local contributors sometimes run a standalone mongod, while production and
// CI use a replica set. Keep the HTTP journey executable locally by removing
// only the transaction option in this test process; all reads, writes, hooks,
// authentication and route middleware still use the real database and app.
// Transaction behavior itself is covered by the dedicated concurrency suites.
const installStandaloneSessionShim = (t) => {
  if (transactionCapable) return;

  const bookingSave = Booking.prototype.save;
  const paymentSave = Payment.prototype.save;
  const vehicleFindOneAndUpdate = Vehicle.findOneAndUpdate.bind(Vehicle);
  const paymentFindOneAndUpdate = Payment.findOneAndUpdate.bind(Payment);

  t.mock.method(mongoose, "startSession", async () => ({
    startTransaction() {},
    async withTransaction(work) {
      return work();
    },
    async commitTransaction() {},
    async abortTransaction() {},
    async endSession() {},
  }));
  t.mock.method(mongoose.Query.prototype, "session", function () {
    return this;
  });
  t.mock.method(Booking.prototype, "save", function (options = {}) {
    return bookingSave.call(this, { ...options, session: undefined });
  });
  t.mock.method(Payment.prototype, "save", function (options = {}) {
    return paymentSave.call(this, { ...options, session: undefined });
  });
  t.mock.method(Booking, "create", async (documents) =>
    Promise.all(documents.map((document) => new Booking(document).save())),
  );
  t.mock.method(Payment, "create", async (documents) =>
    Promise.all(documents.map((document) => new Payment(document).save())),
  );
  t.mock.method(Vehicle, "findOneAndUpdate", (filter, update, options = {}) =>
    vehicleFindOneAndUpdate(filter, update, { ...options, session: undefined }),
  );
  t.mock.method(Payment, "findOneAndUpdate", (filter, update, options = {}) =>
    paymentFindOneAndUpdate(filter, update, { ...options, session: undefined }),
  );
};

const jsonRequest = async (path, { method = "GET", body, cookie, key } = {}) => {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  if (key) headers["Idempotency-Key"] = key;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  return { response, payload };
};

const login = async (email, password) => {
  const { response, payload } = await jsonRequest("/api/v1/users/login", {
    method: "POST",
    body: { email, password },
  });
  assert.equal(response.status, 200, JSON.stringify(payload));
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie?.startsWith("jwt="));
  return cookie;
};

before(async () => {
  if (unavailable) return;
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (connected) {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  }
});

beforeEach(async () => {
  if (unavailable) return;
  await Promise.all([
    Payment.deleteMany({}),
    Booking.deleteMany({}),
    Vehicle.deleteMany({}),
    Company.deleteMany({}),
    User.deleteMany({}),
  ]);
});

test(
  "customer checkout to company cash collection completes through real HTTP routes",
  { skip: unavailable },
  async (t) => {
    installStandaloneSessionShim(t);
    const password = "StrongPass123!";
    const customer = await User.create({
      name: "E2E Customer",
      email: "customer-e2e@nexride.test",
      phoneNumber: "+218910000001",
      password,
      passwordConfirm: password,
      role: "customer",
    });
    const companyUser = await User.create({
      name: "E2E Company Operator",
      email: "company-e2e@nexride.test",
      phoneNumber: "+218910000002",
      password,
      passwordConfirm: password,
      role: "company",
    });
    const company = await Company.create({
      ownerId: companyUser._id,
      name: "NexRide E2E Rentals",
      subdomain: "nexride-e2e-rentals",
      slug: "nexride-e2e-rentals",
      email: "rentals-e2e@nexride.test",
      phone: "+218910000003",
      city: "Tripoli",
      address: "Airport Road",
      status: "APPROVED",
      approvedAt: new Date(),
    });
    companyUser.company = company._id;
    await companyUser.save({ validateBeforeSave: false });

    const vehicle = await Vehicle.create({
      companyId: company._id,
      make: "Mercedes-Benz",
      model: "G-Class",
      year: 2025,
      type: "SUV",
      transmission: "AUTOMATIC",
      fuelType: "GASOLINE",
      seats: 5,
      dailyPrice: 500,
      city: "Tripoli",
      pickupLocation: "Airport Road depot",
      listingStatus: "PUBLISHED",
      operationalStatus: "AVAILABLE",
    });

    const customerCookie = await login(customer.email, password);
    const startDate = new Date(Date.now() + 14 * 86400000).toISOString();
    const endDate = new Date(Date.now() + 17 * 86400000).toISOString();
    const idempotencyKey = "e2e-checkout-550e8400-e29b-41d4-a716";
    const bookingBody = {
      vehicleId: vehicle._id.toString(),
      startDate,
      endDate,
      pickupLocation: vehicle.pickupLocation,
      paymentMethod: "CASH_ON_DELIVERY",
      addonIds: ["insurance"],
    };

    const first = await jsonRequest("/api/v1/bookings", {
      method: "POST",
      body: bookingBody,
      cookie: customerCookie,
      key: idempotencyKey,
    });
    assert.equal(first.response.status, 201, JSON.stringify(first.payload));
    assert.equal(first.payload.data.booking.paymentStatus, "UNPAID");
    assert.equal(first.payload.data.payment.status, "PENDING");

    const replay = await jsonRequest("/api/v1/bookings", {
      method: "POST",
      body: bookingBody,
      cookie: customerCookie,
      key: idempotencyKey,
    });
    assert.equal(replay.response.status, 201, JSON.stringify(replay.payload));
    assert.equal(replay.payload.data.booking._id, first.payload.data.booking._id);
    assert.equal(await Booking.countDocuments({}), 1);
    assert.equal(await Payment.countDocuments({}), 1);

    const paymentId = first.payload.data.payment._id;
    const forbidden = await jsonRequest(
      `/api/v1/payments/${paymentId}/collect-cash`,
      { method: "PATCH", cookie: customerCookie },
    );
    assert.equal(forbidden.response.status, 403);

    const companyCookie = await login(companyUser.email, password);
    const collected = await jsonRequest(
      `/api/v1/payments/${paymentId}/collect-cash`,
      { method: "PATCH", cookie: companyCookie },
    );
    assert.equal(collected.response.status, 200, JSON.stringify(collected.payload));
    assert.equal(collected.payload.data.payment.status, "COMPLETED");
    assert.equal(collected.payload.data.booking.paymentStatus, "PAID");

    const history = await jsonRequest("/api/v1/bookings/my-bookings", {
      cookie: customerCookie,
    });
    assert.equal(history.response.status, 200, JSON.stringify(history.payload));
    assert.equal(history.payload.results, 1);
    assert.equal(history.payload.data.bookings[0]._id, first.payload.data.booking._id);
    assert.equal(history.payload.data.bookings[0].paymentStatus, "PAID");
  },
);
