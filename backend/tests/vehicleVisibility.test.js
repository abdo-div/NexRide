import assert from "node:assert/strict";
import { test } from "node:test";
import adminRouter from "../routes/admin.routes.js";
import { restrictTo } from "../middlewares/authMiddleware.js";
import Company from "../models/Company_model.js";
import Vehicle from "../models/vehicle_model.js";
import {
  buildPublicVehicleFilter,
  fetchAllVehicles,
  fetchAvailableVehicles,
  fetchVehicleById,
  getApprovedCompanyIds,
  sanitizePublicVehicleQuery,
} from "../services/vehicleService.js";

const approvedCompanyId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const pendingCompanyId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const suspendedCompanyId = "cccccccccccccccccccccccc";
const vehicleId = "111111111111111111111111";

const visibleVehicle = (overrides = {}) => ({
  _id: vehicleId,
  companyId: approvedCompanyId,
  listingStatus: "PUBLISHED",
  operationalStatus: "AVAILABLE",
  deletedAt: null,
  ...overrides,
});

const matchesPublicFilter = (filter, vehicle) => {
  if (filter._id && String(filter._id) !== String(vehicle._id)) return false;
  if (vehicle.listingStatus !== filter.listingStatus) return false;
  if (vehicle.operationalStatus !== filter.operationalStatus) return false;
  if (vehicle.deletedAt !== null) return false;
  if (!filter.companyId.$in.some((id) => String(id) === String(vehicle.companyId))) {
    return false;
  }
  return !filter.$and?.some(
    (condition) => String(condition.companyId) !== String(vehicle.companyId),
  );
};

const mockApprovedCompanies = (t, companyIds) => {
  let companyFilter;
  t.mock.method(Company, "find", (filter) => {
    companyFilter = filter;
    return { distinct: async (field) => (field === "_id" ? companyIds : []) };
  });
  return () => companyFilter;
};

test("public vehicle query uses PUBLISHED, AVAILABLE, non-deleted vehicles of approved companies", async (t) => {
  const getCompanyFilter = mockApprovedCompanies(t, [approvedCompanyId]);
  const approvedIds = await getApprovedCompanyIds();
  const filter = buildPublicVehicleFilter(approvedIds);

  assert.deepEqual(getCompanyFilter(), {
    status: "APPROVED",
    deletedAt: null,
  });
  assert.equal(matchesPublicFilter(filter, visibleVehicle()), true);
  assert.equal(
    matchesPublicFilter(filter, visibleVehicle({ listingStatus: "DRAFT" })),
    false,
  );
  assert.equal(
    matchesPublicFilter(filter, visibleVehicle({ listingStatus: "SUSPENDED" })),
    false,
  );
  assert.equal(
    matchesPublicFilter(filter, visibleVehicle({ operationalStatus: "UNAVAILABLE" })),
    false,
  );
  assert.equal(
    matchesPublicFilter(filter, visibleVehicle({ operationalStatus: "MAINTENANCE" })),
    false,
  );
  assert.equal(
    matchesPublicFilter(filter, visibleVehicle({ deletedAt: new Date() })),
    false,
  );
  assert.equal(
    matchesPublicFilter(filter, visibleVehicle({ companyId: pendingCompanyId })),
    false,
  );
  assert.equal(
    matchesPublicFilter(filter, visibleVehicle({ companyId: suspendedCompanyId })),
    false,
  );
});

test("public list ignores status, company, and soft-delete filter overrides", () => {
  const query = sanitizePublicVehicleQuery({
    listingStatus: "DRAFT",
    operationalStatus: "UNAVAILABLE",
    companyId: pendingCompanyId,
    deletedAt: { ne: null },
    type: "SUV",
    city: "Tripoli",
    page: "2",
    limit: "10",
    sort: "-dailyPrice",
    fields: "make,model",
  });

  assert.deepEqual(query, {
    type: "SUV",
    city: "Tripoli",
    page: "2",
    limit: "10",
    sort: "-dailyPrice",
    fields: "make,model",
  });
  assert.deepEqual(
    buildPublicVehicleFilter([approvedCompanyId]),
    {
      listingStatus: "PUBLISHED",
      operationalStatus: "AVAILABLE",
      deletedAt: null,
      companyId: { $in: [approvedCompanyId] },
    },
  );
});

test("public vehicle detail rejects non-public vehicles and returns a valid public vehicle", async (t) => {
  mockApprovedCompanies(t, [approvedCompanyId]);
  let candidate = visibleVehicle({ listingStatus: "DRAFT" });
  let queryFilter;
  t.mock.method(Vehicle, "findOne", (filter) => {
    queryFilter = filter;
    const result = matchesPublicFilter(filter, candidate) ? candidate : null;
    return {
      populate() {
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve(result).then(resolve, reject);
      },
    };
  });

  await assert.rejects(fetchVehicleById(vehicleId), { statusCode: 404 });
  assert.equal(queryFilter.listingStatus, "PUBLISHED");
  assert.equal(queryFilter.operationalStatus, "AVAILABLE");

  candidate = visibleVehicle();
  const result = await fetchVehicleById(vehicleId);
  assert.equal(result, candidate);
  assert.equal(matchesPublicFilter(queryFilter, result), true);
});

test("public list applies immutable visibility filters while preserving legitimate filters", async (t) => {
  mockApprovedCompanies(t, [approvedCompanyId]);
  const initialFilters = [];
  const clientFilters = [];
  const query = {
    find(filter) {
      clientFilters.push(filter);
      return this;
    },
    sort() { return this; },
    select() { return this; },
    skip() { return this; },
    limit() { return this; },
    populate: async () => [],
  };
  t.mock.method(Vehicle, "find", (filter) => {
    initialFilters.push(filter);
    return query;
  });

  await fetchAllVehicles(
    {
      listingStatus: "DRAFT",
      operationalStatus: "UNAVAILABLE",
      companyId: pendingCompanyId,
      deletedAt: { ne: null },
      type: "SUV",
      sort: "-dailyPrice",
      page: "2",
      limit: "10",
    },
    null,
    true,
  );

  assert.deepEqual(initialFilters[0], buildPublicVehicleFilter([approvedCompanyId]));
  assert.deepEqual(clientFilters[0], { type: "SUV" });
});

test("public availability search keeps fixed visibility despite custom status filters", async (t) => {
  mockApprovedCompanies(t, [approvedCompanyId]);
  let initialFilter;
  const query = {
    sort() { return this; },
    select() { return this; },
    skip() { return this; },
    limit() { return this; },
    populate: async () => [],
  };
  t.mock.method(Vehicle, "find", (filter) => {
    initialFilter = filter;
    return query;
  });

  await fetchAvailableVehicles(
    {
      listingStatus: "DRAFT",
      operationalStatus: "UNAVAILABLE",
      companyId: pendingCompanyId,
      type: "suv",
      minPrice: "50",
    },
  );

  assert.equal(initialFilter.listingStatus, "PUBLISHED");
  assert.equal(initialFilter.operationalStatus, "AVAILABLE");
  assert.deepEqual(initialFilter.companyId, { $in: [approvedCompanyId] });
  assert.deepEqual(initialFilter.type, { $in: ["SUV"] });
  assert.deepEqual(initialFilter.dailyPrice, { $gte: 50 });
});

test("admin vehicle listing remains broad and behind the existing admin guard", async (t) => {
  const route = adminRouter.stack.find((layer) => layer.route?.path === "/vehicles");
  assert.ok(route);

  const adminGuard = restrictTo("admin");
  const customerError = await new Promise((resolve) =>
    adminGuard({ user: { role: "customer" } }, {}, resolve),
  );
  assert.equal(customerError.statusCode, 403);
  assert.equal(
    await new Promise((resolve) =>
      adminGuard({ user: { role: "admin" } }, {}, resolve),
    ),
    undefined,
  );

  let initialFilter;
  const query = {
    find() { return this; },
    sort() { return this; },
    select() { return this; },
    skip() { return this; },
    limit() { return this; },
    populate: async () => [],
  };
  t.mock.method(Vehicle, "find", (filter) => {
    initialFilter = filter;
    return query;
  });

  await fetchAllVehicles({ listingStatus: "DRAFT", limit: "10" });
  assert.deepEqual(initialFilter, {});
});