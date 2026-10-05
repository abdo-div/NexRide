import assert from "node:assert/strict";
import { test } from "node:test";

import Booking from "../models/booking_model.js";
import Company from "../models/Company_model.js";
import MaintenanceEvent from "../models/Maintenance_model.js";
import Payment from "../models/payment_model.js";
import User from "../models/User_model.js";
import Vehicle from "../models/vehicle_model.js";

import adminRouter from "../routes/admin.routes.js";
import { safePagination } from "../middlewares/pagination.middleware.js";

import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  buildPaginationMeta,
  resolvePagination,
} from "../utils/pagination.js";
import { runPaginatedQuery } from "../utils/paginatedQuery.js";

import { getAllUsers } from "../controllers/userController.js";
import { getAllAdminCompanies } from "../controllers/companyController.js";
import { getMaintenanceEvents } from "../controllers/maintenanceController.js";

import * as paymentService from "../services/paymentService.js";
import * as maintenanceService from "../services/maintenanceService.js";
import { buildPayoutLedger } from "../services/payoutService.js";

/**
 * Focused admin pagination coverage.
 *
 * Every case runs against in-memory model doubles: no database, Redis, Moamalat
 * credentials or production secrets are required.
 */

// -----------------------------------------------------------------------------
// Test doubles
// -----------------------------------------------------------------------------

/** A thenable that mirrors a Mongoose Query chain and records what was applied. */
const makeQuery = (docs, calls) => {
  const query = {
    find(filter) {
      // Mongoose merges conditions on a re-issued find(); record the merge.
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
      // MongoDB applies the window server-side, so the double must too.
      const skip = calls.skip ?? 0;
      const end = calls.limit === undefined ? undefined : skip + calls.limit;
      return Promise.resolve(docs.slice(skip, end)).then(resolve, reject);
    },
  };
  return query;
};

/** Minimal model double exposing the two calls a paginated query relies on. */
const makeModel = (docs = []) => {
  const calls = { countFilters: [] };
  return {
    calls,
    find(filter) {
      calls.findFilter = filter;
      return makeQuery(docs, calls);
    },
    countDocuments(filter) {
      calls.countFilters.push(filter);
      return Promise.resolve(docs.length);
    },
  };
};

/** Mongoose-style chain bound to a fixed document, for model-level mocks. */
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

const makeUserDoc = (overrides = {}) => ({
  _id: "111111111111111111111111",
  name: "Renter",
  role: "customer",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

// -----------------------------------------------------------------------------
// resolvePagination: defaults, clamping, normalization
// -----------------------------------------------------------------------------

test("pagination defaults to page 1 and the default page limit", () => {
  const resolved = resolvePagination({});

  assert.equal(resolved.page, 1);
  assert.equal(resolved.limit, DEFAULT_PAGE_LIMIT);
  assert.equal(resolved.skip, 0);
});

test("requested page and limit are honored and drive skip", () => {
  const resolved = resolvePagination({ page: "4", limit: "25" });

  assert.equal(resolved.page, 4);
  assert.equal(resolved.limit, 25);
  assert.equal(resolved.skip, 75);
});

test("limit is hard-capped at the safe maximum", () => {
  const resolved = resolvePagination({ page: "1", limit: "5000" });

  assert.equal(resolved.limit, MAX_PAGE_LIMIT);
  assert.equal(resolved.skip, 0);
});

test("invalid pagination values are normalized instead of throwing", () => {
  const resolved = resolvePagination({
    page: "0",
    limit: "-10",
    extra: "kept",
  });

  assert.equal(resolved.page, 1);
  assert.equal(resolved.limit, DEFAULT_PAGE_LIMIT);
  assert.equal(resolved.skip, 0);
});

test("non-numeric pagination values fall back to the defaults", () => {
  const resolved = resolvePagination({ page: "abc", limit: "xyz" });

  assert.equal(resolved.page, 1);
  assert.equal(resolved.limit, DEFAULT_PAGE_LIMIT);
});

test("a missing query object resolves to the defaults", () => {
  const resolved = resolvePagination();

  assert.deepEqual(resolved, { page: 1, limit: DEFAULT_PAGE_LIMIT, skip: 0 });
});

test("custom default and maximum limits are respected", () => {
  const resolved = resolvePagination({ limit: "500" }, { defaultLimit: 50, maxLimit: 200 });

  assert.equal(resolved.limit, 200);
});

// -----------------------------------------------------------------------------
// buildPaginationMeta: the shared response shape
// -----------------------------------------------------------------------------

test("pagination metadata exposes total, totalPages and the navigation flags", () => {
  const meta = buildPaginationMeta({ page: 2, limit: 20, total: 45 });

  assert.deepEqual(meta, {
    page: 2,
    limit: 20,
    total: 45,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: true,
  });
});

test("the first page reports no previous page", () => {
  const meta = buildPaginationMeta({ page: 1, limit: 20, total: 45 });

  assert.equal(meta.hasPreviousPage, false);
  assert.equal(meta.hasNextPage, true);
});

test("the last page reports no next page", () => {
  const meta = buildPaginationMeta({ page: 3, limit: 20, total: 45 });

  assert.equal(meta.hasNextPage, false);
  assert.equal(meta.hasPreviousPage, true);
});

test("an exact multiple of the page size does not report a trailing empty page", () => {
  const meta = buildPaginationMeta({ page: 2, limit: 20, total: 40 });

  assert.equal(meta.totalPages, 2);
  assert.equal(meta.hasNextPage, false);
});

test("an empty result set reports zero pages and no navigation", () => {
  const meta = buildPaginationMeta({ page: 1, limit: 20, total: 0 });

  assert.equal(meta.totalPages, 0);
  assert.equal(meta.hasNextPage, false);
  assert.equal(meta.hasPreviousPage, false);
});

// -----------------------------------------------------------------------------
// runPaginatedQuery: skip/limit pushed down + trustworthy totals
// -----------------------------------------------------------------------------

test("the page window is pushed down to the database instead of sliced in memory", async () => {
  const model = makeModel(Array.from({ length: 60 }, (_, i) => ({ _id: i })));

  await runPaginatedQuery(model, {}, { page: "3", limit: "20" });

  assert.equal(model.calls.skip, 40);
  assert.equal(model.calls.limit, 20);
});

test("the total count is computed against the identical filter as the rows", async () => {
  const model = makeModel([{ _id: 1 }, { _id: 2 }, { _id: 3 }]);

  const { pagination } = await runPaginatedQuery(
    model,
    { role: "customer" },
    { page: "1", limit: "2" },
  );

  assert.deepEqual(model.calls.countFilters[0], { role: "customer" });
  assert.deepEqual(model.calls.findFilter, { role: "customer" });
  assert.equal(pagination.total, 3);
  assert.equal(pagination.totalPages, 2);
  assert.equal(pagination.hasNextPage, true);
});

test("the total count includes the base filter, never only the query string", async () => {
  const model = makeModel([]);

  const { pagination } = await runPaginatedQuery(
    model,
    { companyId: "tenant-a" },
    { status: "ACTIVE" },
  );

  // A count that dropped the tenant scope would leak another tenant's records.
  assert.deepEqual(model.calls.countFilters[0], {
    $and: [{ companyId: "tenant-a" }, { status: "ACTIVE" }],
  });
  assert.equal(pagination.total, 0);
});

test("the count respects the base filter, not just the returned page", async () => {
  const model = makeModel([]);
  let countedFilter;

  model.countDocuments = (filter) => {
    countedFilter = filter;
    return Promise.resolve(41);
  };

  const { pagination } = await runPaginatedQuery(
    model,
    { status: "PENDING" },
    { page: "2", limit: "20" },
  );

  assert.deepEqual(countedFilter, { status: "PENDING" });
  assert.equal(pagination.total, 41);
  assert.equal(pagination.totalPages, 3);
  assert.equal(pagination.hasNextPage, true);
});

test("filters remain applied while paginating", async () => {
  const model = makeModel([{ _id: 1 }]);

  const { pagination } = await runPaginatedQuery(
    model,
    {},
    { page: "2", limit: "10", role: "customer", status: "ACTIVE" },
  );

  assert.deepEqual(model.calls.findFilter, { role: "customer", status: "ACTIVE" });
  assert.deepEqual(model.calls.countFilters[0], { role: "customer", status: "ACTIVE" });
  assert.equal(pagination.page, 2);
  assert.equal(model.calls.skip, 10);
});

test("page and limit query controls never leak into the filter", async () => {
  const model = makeModel([{ _id: 1 }]);

  await runPaginatedQuery(model, {}, { page: "2", limit: "5", sort: "-name" });

  assert.deepEqual(model.calls.findFilter, {});
  assert.equal(model.calls.sort, "-name _id");
});

test("the default ordering is deterministic and newest-first", async () => {
  const model = makeModel([{ _id: 1 }]);

  await runPaginatedQuery(model, {}, {});

  assert.equal(model.calls.sort, "-createdAt _id");
});

test("a custom sort always carries an _id tiebreaker so pages cannot overlap", async () => {
  const model = makeModel([{ _id: 1 }]);

  await runPaginatedQuery(model, {}, { sort: "make,model" });

  assert.equal(model.calls.sort, "make model _id");
});

test("free-text search is applied to both the rows and the total", async () => {
  const model = makeModel([{ _id: 1 }]);

  await runPaginatedQuery(model, {}, { search: "tripoli" }, { searchFields: ["city", "make"] });

  assert.deepEqual(model.calls.findFilter.$and, [{ $or: [{ city: /tripoli/i }, { make: /tripoli/i }] }]);
  assert.deepEqual(model.calls.countFilters[0].$and, model.calls.findFilter.$and);
});

test("search is ignored when the endpoint declares no search fields", async () => {
  const model = makeModel([{ _id: 1 }]);

  await runPaginatedQuery(model, {}, { search: "anything" });

  assert.deepEqual(model.calls.findFilter, {});
});

test("query keys consumed by the caller are never re-applied as raw filters", async () => {
  const model = makeModel([{ _id: 1 }]);

  await runPaginatedQuery(
    model,
    { status: { $ne: "COMPLETED" } },
    { status: "OVERDUE", hub: "Tripoli", page: "1" },
    { excludeFields: ["status", "hub"] },
  );

  assert.deepEqual(model.calls.findFilter, { status: { $ne: "COMPLETED" } });
  assert.deepEqual(model.calls.countFilters[0], { status: { $ne: "COMPLETED" } });
});

test("search preserves a caller-supplied $and clause", async () => {
  const model = makeModel([{ _id: 1 }]);

  await runPaginatedQuery(
    model,
    {},
    { search: "x", extra: 1 },
    { searchFields: ["city"] },
  );

  assert.deepEqual(model.calls.findFilter.$and, [{ city: /x/i }]);
});

// -----------------------------------------------------------------------------
// safePagination middleware
// -----------------------------------------------------------------------------

const runSafePagination = (query, defaultLimit = 20, maxLimit = 100) => {
  const req = { query: { ...query } };
  let nextCalled = false;
  safePagination(defaultLimit, maxLimit)(req, {}, () => {
    nextCalled = true;
  });
  return { req, nextCalled };
};

test("safePagination exposes page, limit and skip on the request", () => {
  const { req, nextCalled } = runSafePagination({ page: "2", limit: "50" });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.pagination, { page: 2, limit: 50, skip: 50 });
  assert.equal(req.query.page, "2");
  assert.equal(req.query.limit, "50");
});

test("safePagination clamps an oversized limit and normalizes a broken page", () => {
  const { req } = runSafePagination({ page: "-3", limit: "999" });

  assert.equal(req.pagination.page, 1);
  assert.equal(req.pagination.limit, 100);
  assert.equal(req.pagination.skip, 0);
});

// -----------------------------------------------------------------------------
// Admin services return real pages + metadata
// -----------------------------------------------------------------------------

test("the admin customer register is server-side paginated with a matching total", async (t) => {
  const docs = Array.from({ length: 25 }, (_, i) => makeUserDoc({ _id: String(i) }));
  const sink = {};
  stubModelQuery(t, User, docs, sink);

  const { fetchAllUsers } = await import("../services/userService.js");
  const result = await fetchAllUsers({ role: "customer", page: "2", limit: "10" });

  assert.equal(result.users.length, 10);
  assert.equal(result.pagination.page, 2);
  assert.equal(result.pagination.limit, 10);
  assert.equal(result.pagination.total, 25);
  assert.equal(result.pagination.totalPages, 3);
  assert.equal(result.pagination.hasNextPage, true);
  assert.equal(result.pagination.hasPreviousPage, true);
  assert.equal(sink.skip, 10);
  assert.equal(sink.limit, 10);
  // The role filter is applied to both the page and the count.
  assert.deepEqual(sink.findFilter, { role: "customer" });
  assert.deepEqual(sink.countFilter, { role: "customer" });
});

test("the admin company register is server-side paginated", async (t) => {
  const docs = Array.from({ length: 7 }, (_, i) => ({ _id: String(i), name: `C${i}` }));
  const sink = {};
  stubModelQuery(t, Company, docs, sink);

  const { fetchAllAdminCompanies } = await import("../services/companyService.js");
  const result = await fetchAllAdminCompanies({ page: "1", limit: "5" });

  assert.equal(result.companies.length, 5);
  assert.equal(result.pagination.total, 7);
  assert.equal(result.pagination.totalPages, 2);
  assert.equal(result.pagination.hasNextPage, true);
  assert.equal(result.pagination.hasPreviousPage, false);
  assert.equal(sink.skip, 0);
  assert.equal(sink.limit, 5);
});

test("the admin booking register is server-side paginated", async (t) => {
  const docs = Array.from({ length: 41 }, (_, i) => ({ _id: String(i) }));
  const sink = {};
  stubModelQuery(t, Booking, docs, sink);

  const { getAll } = await import("../services/serviceFactory.js");
  const result = await getAll(Booking, ["bookingStatus"])({ page: "3", limit: "20" });

  // Page 3 of 41 rows at 20 per page holds the single leftover row.
  assert.equal(result.data.length, 1);
  assert.equal(result.results, 1);
  assert.equal(result.pagination.total, 41);
  assert.equal(result.pagination.totalPages, 3);
  assert.equal(result.pagination.hasNextPage, false);
  assert.equal(result.pagination.hasPreviousPage, true);
  assert.equal(sink.skip, 40);
  assert.equal(sink.limit, 20);
});

test("the payment ledger is server-side paginated and respects the tenant scope", async (t) => {
  const docs = Array.from({ length: 12 }, (_, i) => ({ _id: String(i), status: "COMPLETED" }));
  const sink = {};
  stubModelQuery(t, Payment, docs, sink);

  const result = await paymentService.fetchAllPayments(
    { page: "2", limit: "5" },
    { role: "company", company: "aaaaaaaaaaaaaaaaaaaaaaaa" },
  );

  assert.equal(result.payments.length, 5);
  assert.equal(result.pagination.total, 12);
  assert.equal(result.pagination.totalPages, 3);
  assert.equal(result.pagination.hasNextPage, true);
  // Tenant isolation is untouched by pagination: the base scope is counted too.
  // A count that dropped it would report the platform-wide total instead.
  assert.deepEqual(sink.findFilter, { companyId: "aaaaaaaaaaaaaaaaaaaaaaaa" });
  assert.deepEqual(sink.countFilter, { companyId: "aaaaaaaaaaaaaaaaaaaaaaaa" });
  assert.equal(sink.skip, 5);
  assert.equal(sink.limit, 5);
});

test("an admin sees the full payment ledger rather than a tenant-scoped one", async (t) => {
  const sink = {};
  stubModelQuery(t, Payment, [{ _id: "1" }], sink);

  await paymentService.fetchAllPayments({}, { role: "admin" });

  assert.deepEqual(sink.findFilter, {});
  assert.equal(sink.findFilter.companyId, undefined);
});

// -----------------------------------------------------------------------------
// Maintenance ledger: derived filters must be DB-side so totals stay correct
// -----------------------------------------------------------------------------

const maintenanceDoc = (overrides = {}) => ({
  _id: "cccccccccccccccccccccccc",
  status: "SCHEDULED",
  estReturnDate: null,
  toObject() {
    return { _id: this._id, status: this.status, estReturnDate: this.estReturnDate };
  },
  ...overrides,
});

test("maintenance events are paginated with a matching total", async (t) => {
  const sink = {};
  const docs = Array.from({ length: 30 }, (_, i) => maintenanceDoc({ _id: String(i) }));
  stubModelQuery(t, MaintenanceEvent, docs, sink);

  const { events, pagination } = await maintenanceService.listMaintenanceEvents({
    page: "2",
    limit: "10",
  });

  assert.equal(events.length, 10);
  assert.equal(pagination.total, 30);
  assert.equal(pagination.totalPages, 3);
  assert.equal(pagination.hasNextPage, true);
  assert.equal(sink.skip, 10);
  assert.equal(sink.limit, 10);
});

test("the maintenance OVERDUE filter is applied in the database, not after the cap", async (t) => {
  const sink = {};
  stubModelQuery(t, MaintenanceEvent, [maintenanceDoc()], sink);

  const before = Date.now();
  await maintenanceService.listMaintenanceEvents({ status: "OVERDUE" });
  const after = Date.now();

  // An open event past its estimated return date — expressed as Mongo operators.
  const filter = sink.findFilter;
  assert.deepEqual(filter.status, { $ne: "COMPLETED" });
  assert.equal(filter.estReturnDate.$ne, null);
  assert.ok(
    filter.estReturnDate.$lt instanceof Date &&
      filter.estReturnDate.$lt.getTime() >= before &&
      filter.estReturnDate.$lt.getTime() <= after,
  );
  // The literal string "OVERDUE" is never stored on the document, so it must
  // never be pushed into the query.
  assert.deepEqual(sink.countFilter, sink.findFilter);
});

test("a stored maintenance status stays an exact match", async (t) => {
  const sink = {};
  stubModelQuery(t, MaintenanceEvent, [maintenanceDoc()], sink);

  await maintenanceService.listMaintenanceEvents({ status: "COMPLETED" });

  assert.equal(sink.findFilter.status, "COMPLETED");
});

test("the maintenance hub scope is resolved to a database filter", async (t) => {
  const sink = {};
  const vehicleId = "aaaaaaaaaaaaaaaaaaaaaaaa";
  const companyId = "bbbbbbbbbbbbbbbbbbbbbbbb";
  stubModelQuery(t, MaintenanceEvent, [maintenanceDoc()], sink);
  t.mock.method(Vehicle, "distinct", async () => [vehicleId]);
  t.mock.method(Company, "distinct", async () => [companyId]);

  await maintenanceService.listMaintenanceEvents({ hub: "Tripoli" });

  assert.deepEqual(sink.findFilter, {
    $and: [
      {},
      { $or: [{ vehicleId: { $in: [vehicleId] } }, { companyId: { $in: [companyId] } }] },
    ],
  });
  assert.deepEqual(sink.countFilter, sink.findFilter);
});

test("maintenance category, priority and partner filters all reach the total", async (t) => {
  const sink = {};
  stubModelQuery(t, MaintenanceEvent, [maintenanceDoc()], sink);

  await maintenanceService.listMaintenanceEvents({
    category: "BRAKES",
    priority: "CRITICAL",
    companyId: "dddddddddddddddddddddddd",
  });

  assert.equal(sink.findFilter.category, "BRAKES");
  assert.equal(sink.findFilter.priority, "CRITICAL");
  assert.equal(String(sink.findFilter.companyId), "dddddddddddddddddddddddd");
  assert.deepEqual(sink.countFilter, sink.findFilter);
});

// -----------------------------------------------------------------------------
// Payout ledger: $facet keeps the page and the total on one pipeline
// -----------------------------------------------------------------------------

/**
 * Stands in for MongoDB's `$facet`: applies the sort/skip/limit branch to the
 * fixture rows and the `$count` branch to the full result set, so the assertions
 * exercise the same windowing the database would perform.
 */
const stubFacetAggregate = (t, rows, total = rows.length) => {
  let pipeline;
  t.mock.method(Payment, "aggregate", async (stages) => {
    pipeline = stages;
    const facet = stages.find((stage) => stage.$facet)?.$facet;
    if (!facet) return rows;

    const sort = facet.rows.find((stage) => stage.$sort)?.$sort;
    const skip = facet.rows.find((stage) => stage.$skip)?.$skip ?? 0;
    const limit = facet.rows.find((stage) => stage.$limit)?.$limit ?? rows.length;

    let window = [...rows];
    if (sort) {
      window = window.sort((a, b) => {
        for (const [field, direction] of Object.entries(sort)) {
          if (a[field] === b[field]) continue;
          return direction === -1 ? b[field] - a[field] : a[field] - b[field];
        }
        return 0;
      });
    }

    return [{ rows: window.slice(skip, skip + limit), meta: [{ total }] }];
  });
  return () => pipeline;
};

test("the payout ledger is paginated and reports a matching total", async (t) => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ _id: String(i), gross: 12 - i }));
  const getPipeline = stubFacetAggregate(t, rows, 34);

  const result = await buildPayoutLedger({ page: "2", limit: "3" });

  assert.equal(result.ledger.length, 3);
  assert.equal(result.pagination.total, 34);
  assert.equal(result.pagination.totalPages, 12);
  assert.equal(result.pagination.hasNextPage, true);
  assert.equal(result.pagination.hasPreviousPage, true);

  const facet = getPipeline().find((stage) => stage.$facet);
  assert.ok(facet, "the ledger must window through $facet");
  assert.deepEqual(facet.$facet.rows[1], { $skip: 3 });
  assert.deepEqual(facet.$facet.rows[2], { $limit: 3 });
  assert.deepEqual(facet.$facet.meta, [{ $count: "total" }]);
});

test("the payout ledger keeps a deterministic ordering across pages", async (t) => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ _id: String(i), gross: 12 - i }));
  const getPipeline = stubFacetAggregate(t, rows);

  await buildPayoutLedger({ page: "1", limit: "20" });

  const facet = getPipeline().find((stage) => stage.$facet);
  assert.deepEqual(facet.$facet.rows[0], { $sort: { gross: -1, _id: 1 } });
});

test("paging the payout ledger yields disjoint, exhaustive windows", async (t) => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ _id: String(i), gross: 10 - i }));
  stubFacetAggregate(t, rows);

  const first = await buildPayoutLedger({ page: "1", limit: "4" });
  const second = await buildPayoutLedger({ page: "2", limit: "4" });
  const third = await buildPayoutLedger({ page: "3", limit: "4" });

  const seen = [...first.ledger, ...second.ledger, ...third.ledger].map((r) => r._id);

  assert.equal(new Set(seen).size, 10, "no row may repeat across pages");
  assert.equal(first.pagination.totalPages, 3);
  assert.equal(third.pagination.hasNextPage, false);
  // Sorted by gross desc: the first page must hold the largest ledgers.
  assert.deepEqual(
    first.ledger.map((r) => r.gross),
    [10, 9, 8, 7],
  );
});

test("the payout ledger keeps its derived payout status on the returned page", async (t) => {
  const rows = [
    { _id: "1", gross: 50, settled: 50, unsettled: 0, processing: 0 },
    { _id: "2", gross: 20, settled: 0, unsettled: 20, processing: 0 },
    { _id: "3", gross: 10, settled: 0, unsettled: 0, processing: 10 },
  ];
  stubFacetAggregate(t, rows);

  const result = await buildPayoutLedger({ page: "1", limit: "20" });

  assert.deepEqual(
    result.ledger.map((row) => row.payoutStatus),
    ["PAID", "PENDING", "PROCESSING"],
  );
});

test("an empty payout ledger reports an empty page instead of throwing", async (t) => {
  t.mock.method(Payment, "aggregate", async () => []);

  const result = await buildPayoutLedger({});

  assert.deepEqual(result.ledger, []);
  assert.equal(result.pagination.total, 0);
  assert.equal(result.pagination.totalPages, 0);
  assert.equal(result.pagination.hasNextPage, false);
});

// -----------------------------------------------------------------------------
// Response envelopes keep their existing shape and gain pagination
// -----------------------------------------------------------------------------

/**
 * `catchAsync` intentionally does not return its promise, so the response has to
 * be awaited through the `json()` call itself.
 */
const captureJson = (handler, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        resolve(this);
        return this;
      },
    };
    handler(req, res, (error) => {
      if (error) reject(error);
    });
  });

test("the customers response keeps data.users and adds pagination", async (t) => {
  stubModelQuery(t, User, [makeUserDoc()]);

  const res = await captureJson(getAllUsers, { query: { role: "customer", page: "1" } });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.ok(Array.isArray(res.body.data.users));
  assert.equal(res.body.results, 1);
  assert.deepEqual(Object.keys(res.body.pagination).sort(), [
    "hasNextPage",
    "hasPreviousPage",
    "limit",
    "page",
    "total",
    "totalPages",
  ]);
});

test("the companies response keeps data.companies and adds pagination", async (t) => {
  stubModelQuery(t, Company, [{ _id: "1", name: "Co" }]);

  const res = await captureJson(getAllAdminCompanies, {
    query: { page: "1", limit: "20" },
  });

  assert.ok(Array.isArray(res.body.data.companies));
  assert.equal(res.body.pagination.limit, 20);
});

test("the maintenance response keeps data.events and adds pagination", async (t) => {
  stubModelQuery(t, MaintenanceEvent, [maintenanceDoc()]);

  const res = await captureJson(getMaintenanceEvents, {
    query: { page: "1", limit: "20" },
  });

  assert.ok(Array.isArray(res.body.data.events));
  assert.equal(res.body.pagination.limit, 20);
  assert.equal(res.body.pagination.total, 1);
});

// -----------------------------------------------------------------------------
// Authorization is unchanged
// -----------------------------------------------------------------------------

test("the admin router still mounts its guards ahead of every route", () => {
  const firstRouteIndex = adminRouter.stack.findIndex((layer) => layer.route);

  assert.ok(firstRouteIndex >= 2, "admin router must mount auth guards before routes");
});

test("the admin-only guard still rejects non-administrators", () => {
  const firstRouteIndex = adminRouter.stack.findIndex((layer) => layer.route);
  const guards = adminRouter.stack.slice(0, firstRouteIndex).map((layer) => layer.handle);
  const authorize = guards[guards.length - 1];

  for (const role of ["customer", "company", "support"]) {
    let error;
    authorize({ user: { role } }, {}, (nextError) => {
      error = nextError;
    });
    assert.equal(error?.statusCode, 403, `${role} must be rejected`);
  }

  let adminError;
  authorize({ user: { role: "admin" } }, {}, (nextError) => {
    adminError = nextError;
  });
  assert.equal(adminError, undefined);
});

test("every admin listing route normalizes the page window before its handler", () => {
  const listingPaths = [
    "/companies",
    "/vehicles",
    "/bookings",
    "/commissions",
    "/maintenance",
    "/payouts/ledger",
  ];

  for (const path of listingPaths) {
    const layer = adminRouter.stack.find(
      (entry) => entry.route?.path === path && entry.route.methods.get,
    );
    assert.ok(layer, `expected a GET route for ${path}`);

    const normalizes = layer.route.stack.some((entry) => {
      const req = { query: { page: "3", limit: "999" } };
      entry.handle(req, {}, () => {});
      return req.pagination?.page === 3 && req.pagination?.limit === 100;
    });

    assert.ok(normalizes, `expected safePagination to normalize ${path}`);
  }
});
