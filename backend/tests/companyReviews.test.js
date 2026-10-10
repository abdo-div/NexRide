import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Review from "../models/review_model.js";
import Vehicle from "../models/vehicle_model.js";
import Company from "../models/Company_model.js";
import { getCompanyReviews, replyToCompanyReview } from "../controllers/companyReviewsController.js";
import { buildCompanyReviews } from "../services/companyReviewsService.js";
import { addCompanyResponseToReview } from "../services/reviewService.js";

const companyA = "bbbbbbbbbbbbbbbbbbbbbbbb";
const companyB = "dddddddddddddddddddddddd";
const customerA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const vehicleA = "cccccccccccccccccccccccc";
const vehicleB = "eeeeeeeeeeeeeeeeeeeeeeee";
const adminId = "999999999999999999999999";

const companyUser = (overrides = {}) => ({
  _id: customerA,
  id: customerA,
  role: "company",
  company: companyA,
  ...overrides,
});

const thenable = (value) => ({ then: (resolve) => resolve(value) });

const chain = (docs = []) => ({
  _docs: docs,
  sort() {
    return this;
  },
  skip() {
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
  lean() {
    return this;
  },
  then(resolve) {
    resolve(this._docs);
  },
});

const monthKey = (year, month) => `${year}-${String(month).padStart(2, "0")}`;
const currentMonthKey = () => {
  const now = new Date();
  return monthKey(now.getUTCFullYear(), now.getUTCMonth() + 1);
};
const previousMonthKey = () => {
  const now = new Date();
  const month = now.getUTCMonth();
  const year = month === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  return monthKey(year, month === 0 ? 12 : month);
};

const reviewDoc = (overrides = {}) => ({
  _id: "ffffffffffffffffffffffff",
  rating: 5,
  review: "The car was spotless and the handover was fast.",
  createdAt: new Date("2026-10-05T10:00:00.000Z"),
  companyResponse: { respondedAt: null, response: null },
  customerId: {
    _id: customerA,
    name: "Ahmed Ali",
    photo: null,
  },
  vehicleId: {
    _id: vehicleA,
    make: "BMW",
    model: "520i",
    year: 2024,
    photos: ["bmw.jpg"],
  },
  bookingId: {
    _id: "eeeeeeeeeeeeeeeeeeeeeeee",
    pickupLocation: "Mitiga Airport VIP Valet Lounge",
    totalDays: 3,
    pickupMethod: "BRANCH_PICKUP",
  },
  ...overrides,
});

const deckFacet = () => {
  const groups = {};
  groups.total = [{ count: 9 }];
  groups.avg = [{ value: 4.1 }];
  groups.distribution = [
    { _id: 5, count: 3 },
    { _id: 4, count: 4 },
    { _id: 3, count: 2 },
    { _id: 2, count: 0 },
  ];
  groups.responded = [{ count: 6 }];
  groups.responseHours = [{ avgMs: 3 * 3600000 }];
  groups.byVehicle = [
    { _id: vehicleA, count: 5, avg: 4.8, positive: 5 },
    { _id: vehicleB, count: 4, avg: 4, positive: 2 },
  ];
  groups.distinctVehicles = [{ count: 2 }];
  groups.currentMonth = [{ count: 2 }];
  groups.previousMonth = [{ count: 1 }];
  const now = new Date();
  groups.trendBuckets = [
    { _id: { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }, count: 2, avg: 4.5 },
    {
      _id: {
        year: now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear(),
        month: now.getUTCMonth() === 0 ? 12 : now.getUTCMonth(),
      },
      count: 1,
      avg: 4,
    },
  ];
  return groups;
};

/** Stubs every model the reviews service touches and records the queries. */
const stubWorkspace = (t, { facet = deckFacet(), listDocs = [reviewDoc()], vehicles = [] } = {}) => {
  const sinks = {
    deckMatches: [],
    listCounts: [],
    listMatches: [],
    vehicleScopes: [],
  };

  const vehicleDocs =
    vehicles.length > 0
      ? vehicles
      : [
          { _id: vehicleA, make: "BMW", model: "520i", year: 2024, photos: ["bmw.jpg"] },
          { _id: vehicleB, make: "Toyota", model: "Camry", year: 2023, photos: [] },
        ];

  t.mock.method(Review, "aggregate", (pipeline) => {
    const match = pipeline.find((stage) => stage.$match)?.$match;
    sinks.deckMatches.push(match);
    return thenable([facet]);
  });

  t.mock.method(Review, "countDocuments", (filter) => {
    sinks.listCounts.push(filter);
    return thenable(filter.rating === 5 ? 3 : 2);
  });

  t.mock.method(Review, "find", (filter) => {
    sinks.listMatches.push(filter);
    return chain(listDocs);
  });

  t.mock.method(Vehicle, "find", (filter) => {
    sinks.vehicleScopes.push(filter);
    return chain(vehicleDocs);
  });

  t.mock.method(Company, "findById", () => ({
    select() {
      return thenable({ _id: companyA, name: "Fleet A", slug: "fleet-a" });
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

test("reviews for a company session stay pinned to the session tenant", async (t) => {
  const sinks = stubWorkspace(t);

  const outcome = await invoke(getCompanyReviews, {
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
  assert.equal(sinks.listMatches[0].companyId.toString(), companyA);
  assert.equal(sinks.vehicleScopes[0].companyId.toString(), companyA);
});

test("an admin may load reviews for another company via ?companyId", async (t) => {
  const sinks = stubWorkspace(t);

  const outcome = await invoke(getCompanyReviews, {
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

  const outcome = await invoke(getCompanyReviews, {
    user: { _id: customerA, id: customerA, role: "company" },
    tenantId: undefined,
    query: {},
  });

  assert.equal(outcome.error.statusCode, 403);
  assert.equal(sinks.deckMatches.length, 0, "no aggregation may run");
  assert.equal(sinks.listMatches.length, 0);
});

test("a missing company document yields 404", async (t) => {
  t.mock.method(Company, "findById", () => ({
    select() {
      return thenable(null);
    },
  }));
  t.mock.method(Review, "aggregate", () => thenable([]));

  const outcome = await invoke(getCompanyReviews, {
    user: companyUser(),
    tenantId: companyA,
    query: {},
  });

  assert.equal(outcome.error.statusCode, 404);
});

test("invalid company identifiers are refused before any query", async () => {
  await assert.rejects(
    () => buildCompanyReviews({ companyId: "not-a-valid-object-id" }),
    (err) => err.statusCode === 400,
  );
});

// ---------------------------------------------------------------------------
// Deck derivation honesty: every number comes from the real Review documents
// ---------------------------------------------------------------------------

test("the deck recomputes summary, distribution and trend from the reviews", async (t) => {
  stubWorkspace(t);

  const deck = await buildCompanyReviews({
    companyId: companyA,
    page: 1,
    limit: 8,
  });

  assert.equal(deck.company.name, "Fleet A");
  assert.equal(deck.summary.total, 9);
  assert.equal(deck.summary.avg, 4.1);
  assert.equal(deck.summary.verified, 9);
  assert.equal(deck.summary.vehicles, 2);
  assert.equal(deck.summary.thisMonth, 2);
  assert.equal(deck.summary.previousMonth, 1);
  assert.equal(deck.summary.monthChangePct, 100);
  assert.equal(deck.summary.responded, 6);
  assert.equal(deck.summary.awaiting, 3);
  assert.equal(deck.summary.responseRatePct, 67);
  assert.equal(deck.summary.avgResponseHours, 3);
  assert.equal(deck.summary.avgDelta, 0.5);

  assert.deepEqual(
    deck.distribution.map((d) => [d.stars, d.count, d.percent]),
    [
      [5, 3, 33.3],
      [4, 4, 44.4],
      [3, 2, 22.2],
      [2, 0, 0],
      [1, 0, 0],
    ],
  );

  // Trend is zero-filled across the last 12 calendar months; the two seeded
  // months keep their real counts and averages.
  assert.equal(deck.trend.length, 12);
  const current = deck.trend.find((m) => m.key === currentMonthKey());
  assert.equal(current.count, 2);
  assert.equal(current.avg, 4.5);
  const previous = deck.trend.find((m) => m.key === previousMonthKey());
  assert.equal(previous.count, 1);
  assert.equal(previous.avg, 4);
  const zeroFilled = deck.trend.find(
    (m) => m.key !== currentMonthKey() && m.key !== previousMonthKey(),
  );
  assert.equal(zeroFilled.count, 0);
  assert.equal(zeroFilled.avg, null);
});

test("the leaderboard ranks vehicles by real average and positive share", async (t) => {
  stubWorkspace(t);

  const deck = await buildCompanyReviews({ companyId: companyA, page: 1, limit: 8 });

  assert.equal(deck.leaderboard.length, 2);
  const [first, second] = deck.leaderboard;
  assert.equal(first.rank, 1);
  assert.equal(first.vehicle.make, "BMW");
  assert.equal(first.avg, 4.8);
  assert.equal(first.count, 5);
  assert.equal(first.positivePct, 100);
  assert.equal(second.vehicle.make, "Toyota");
  assert.equal(second.positivePct, 50);

  assert.deepEqual(deck.vehicles.map((v) => v.make), ["BMW", "Toyota"]);
});

test("the register maps real populated context into the row shape", async (t) => {
  const listDocs = [
    reviewDoc({
      _id: "ffffffffffffffffffffffff",
      companyResponse: {
        respondedAt: new Date("2026-10-06T10:00:00.000Z"),
        response: "Thank you for your kind words!",
      },
    }),
    reviewDoc({
      _id: "abcdefabcdefabcdefabcd",
      companyResponse: { respondedAt: null, response: null },
    }),
  ];
  stubWorkspace(t, { listDocs });

  const deck = await buildCompanyReviews({ companyId: companyA, page: 1, limit: 8 });

  assert.equal(deck.list.length, 2);
  assert.equal(deck.pagination.total, 2);

  const replied = deck.list.find((r) => r.companyResponse.responded);
  assert.ok(replied, "the replied row must be flagged");
  assert.equal(replied.companyResponse.text, "Thank you for your kind words!");
  assert.equal(replied.customer.initials, "AA");
  assert.equal(
    replied.booking.reference,
    "NX-" + String("eeeeeeeeeeeeeeeeeeeeeeee").slice(-6).toUpperCase(),
  );
  assert.equal(replied.booking.pickupLocation, "Mitiga Airport VIP Valet Lounge");
  assert.equal(replied.booking.totalDays, 3);
  assert.equal(replied.vehicle.make, "BMW");
  assert.equal(replied.vehicle.photo, "bmw.jpg");

  const awaiting = deck.list.find((r) => !r.companyResponse.responded);
  assert.equal(awaiting.companyResponse.responded, false);
  assert.equal(awaiting.companyResponse.text, null);
});

// ---------------------------------------------------------------------------
// Register filters map onto the scoped list query
// ---------------------------------------------------------------------------

test("star, vehicle, status and period filters scope the list query", async (t) => {
  const sinks = stubWorkspace(t);

  await buildCompanyReviews({
    companyId: companyA,
    page: 1,
    limit: 8,
    star: 5,
    vehicleId: vehicleA,
    status: "responded",
    period: "year",
  });

  const listMatch = sinks.listMatches[0];
  assert.equal(listMatch.rating, 5);
  assert.equal(String(listMatch.vehicleId), vehicleA);
  assert.deepEqual(listMatch["companyResponse.respondedAt"], { $ne: null });
  assert.ok(listMatch.createdAt.$gte, "year period must bound createdAt");
});

test("awaiting status selects reviews without a persisted reply", async (t) => {
  const sinks = stubWorkspace(t);

  await buildCompanyReviews({
    companyId: companyA,
    page: 1,
    limit: 8,
    status: "awaiting",
  });

  assert.equal(sinks.listMatches[0]["companyResponse.respondedAt"], null);
});

// ---------------------------------------------------------------------------
// Replies persist on the Review document (schema-backed, tenant-verified)
// ---------------------------------------------------------------------------

test("the Review model persists an operator companyResponse subdocument", () => {
  const schema = Review.schema;
  assert.ok(schema.path("companyResponse.response"), "response leaf must exist");
  assert.equal(schema.path("companyResponse.response").defaultValue, null);
  assert.ok(schema.path("companyResponse.respondedAt"), "respondedAt leaf must exist");
  assert.equal(schema.path("companyResponse.respondedAt").defaultValue, null);
});

test("a company reply is stored with the response text and a respondedAt stamp", async (t) => {
  const saved = {
    _id: "ffffffffffffffffffffffff",
    companyId: companyA,
    companyResponse: { response: null, respondedAt: null },
    save() {
      return Promise.resolve(this);
    },
  };
  t.mock.method(Review, "findById", () => thenable(saved));

  const review = await addCompanyResponseToReview(
    "ffffffffffffffffffffffff",
    "Thank you for your feedback!",
    companyA,
  );

  assert.equal(review.companyResponse.response, "Thank you for your feedback!");
  assert.ok(review.companyResponse.respondedAt instanceof Date);
});

test("a company cannot reply to another operator's review", async (t) => {
  t.mock.method(Review, "findById", () =>
    thenable({
      _id: "ffffffffffffffffffffffff",
      companyId: companyB,
      save() {
        return Promise.resolve(this);
      },
    }),
  );

  await assert.rejects(
    () =>
      addCompanyResponseToReview(
        "ffffffffffffffffffffffff",
        "Nice wheels.",
        companyA,
      ),
    (err) => err.statusCode === 403,
  );
});

test("reply controller resolves the session tenant and rejects tenant-less sessions", async (t) => {
  const saved = {
    _id: "ffffffffffffffffffffffff",
    companyId: companyA,
    companyResponse: { response: null, respondedAt: null },
    save() {
      return Promise.resolve(this);
    },
  };
  t.mock.method(Review, "findById", () => thenable(saved));

  const outcome = await invoke(replyToCompanyReview, {
    user: companyUser(),
    tenantId: companyA,
    body: { response: "We are on it!" },
    params: { id: "ffffffffffffffffffffffff" },
  });

  assert.equal(outcome.statusCode, 200);
  assert.equal(outcome.body.data.review.companyResponse.response, "We are on it!");

  const refused = await invoke(replyToCompanyReview, {
    user: { _id: customerA, id: customerA, role: "company" },
    tenantId: null,
    body: { response: "Nope." },
    params: { id: "ffffffffffffffffffffffff" },
  });
  assert.equal(refused.error.statusCode, 403);
});

// Company lookup happens over the resolved (non-forged) tenant scope, so the
// header chip can never reveal another operator's name.
test("deck company context is resolved from the session tenant", async (t) => {
  const sinks = stubWorkspace(t);
  await invoke(getCompanyReviews, {
    user: companyUser(),
    tenantId: companyA,
    query: { companyId: companyB },
  });
  assert.equal(sinks.deckMatches[0].companyId.toString(), companyA);
});