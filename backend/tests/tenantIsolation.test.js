import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import vehicleRouter from "../routes/vehicleRoutes.js";
import bookingRouter from "../routes/bookingRoutes.js";
import paymentRouter from "../routes/paymentRoutes.js";
import { verifyTenantAccess } from "../middlewares/authMiddleware.js";
import { getCompanyPayoutSummary } from "../controllers/paymentController.js";
import { getCompanyVehicles } from "../controllers/vehicleController.js";
import { getCompanyBookings } from "../controllers/bookingController.js";
import * as vehicleService from "../services/vehicleService.js";
import * as paymentService from "../services/paymentService.js";

const customerA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const adminId = "999999999999999999999999";
const companyA = "cccccccccccccccccccccccc";
const companyB = "dddddddddddddddddddddddd";
const vehicleId = "ffffffffffffffffffffffff";
const bookingId = "111111111111111111111111";
const paymentId = "eeeeeeeeeeeeeeeeeeeeeeee";

const companyUser = (overrides = {}) => ({
  _id: customerA,
  id: customerA,
  role: "company",
  company: companyA,
  ...overrides,
});

// verifyTenantAccess() returns a fresh closure per call, so the gates are
// identified by walking and running the chain rather than by comparing
// function references.
const routeHandlers = (router, path, method) => {
  const layer = router.stack.find(
    (item) => item.route?.path === path && item.route.methods?.[method],
  );
  assert.ok(layer, `expected route ${method.toUpperCase()} ${path}`);
  return layer.route.stack.map((item) => item.handle);
};

const createResponse = () => {
  const state = { statusCode: 200, body: undefined, streamed: false, ended: false };
  const res = {
    status(code) {
      state.statusCode = code;
      return res;
    },
    json(body) {
      state.body = body;
      state.ended = true;
      return res;
    },
    setHeader() {
      return res;
    },
    write() {
      state.streamed = true;
      return true;
    },
    end() {
      state.streamed = true;
      state.ended = true;
      return res;
    },
  };
  return { res, state };
};

const runChain = async (handlers, req) => {
  const { res, state } = createResponse();

  for (const handler of handlers) {
    let calledNext = false;
    let error = null;

    await new Promise((resolve) => {
      handler(req, res, (err) => {
        calledNext = true;
        error = err;
        resolve();
      });
      // A handler that responds instead of calling next never resolves here.
      setImmediate(resolve);
    });

    if (error) return { error, ...state };
    if (!calledNext) return { ...state };
  }

  return { ...state };
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

const captureWrite = (modelName, factory) => {
  const captured = [];
  const Model = mongoose.model(modelName);
  const original = Model.findOneAndUpdate;
  Model.findOneAndUpdate = (filter, update, options) => {
    captured.push({ filter, update, options });
    return { then: (resolve) => resolve(factory(filter, update)) };
  };
  return { captured, restore: () => (Model.findOneAndUpdate = original) };
};

// ---------------------------------------------------------------------------
// Requirement (a): Company A cannot fetch/update/delete Company B's vehicle,
// booking or payment by direct resource ID (403 from the gate, 404 from a
// tenant-scoped service write that misses).
// ---------------------------------------------------------------------------

test("Company A cannot update Company B's vehicle by direct ID (route gate)", async () => {
  const handlers = routeHandlers(vehicleRouter, "/:id", "patch");
  const vehicleModel = mongoose.model("Vehicle");
  const originalFindById = vehicleModel.findById;
  const originalFindOneAndUpdate = vehicleModel.findOneAndUpdate;
  let writeCalled = false;

  vehicleModel.findById = () => ({
    then: (resolve) => resolve({ _id: vehicleId, companyId: companyB }),
  });
  vehicleModel.findOneAndUpdate = () => {
    writeCalled = true;
    return { then: (resolve) => resolve(null) };
  };

  try {
    const outcome = await runChain(handlers, {
      params: { id: vehicleId },
      body: { dailyPrice: 120 },
      user: companyUser(),
      tenantId: companyA,
    });

    assert.ok(outcome.error, "a foreign vehicle update must be refused");
    assert.equal(outcome.error.statusCode, 403);
    assert.equal(writeCalled, false, "no write is attempted against tenant B");
  } finally {
    vehicleModel.findById = originalFindById;
    vehicleModel.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("Company A cannot change Company B's vehicle status by direct ID", async () => {
  const handlers = routeHandlers(vehicleRouter, "/:id/status", "patch");
  const vehicleModel = mongoose.model("Vehicle");
  const originalFindById = vehicleModel.findById;

  vehicleModel.findById = () => ({
    then: (resolve) => resolve({ _id: vehicleId, companyId: companyB }),
  });

  try {
    const outcome = await runChain(handlers, {
      params: { id: vehicleId },
      body: { status: "MAINTENANCE" },
      user: companyUser(),
      tenantId: companyA,
    });

    assert.ok(outcome.error, "a foreign status change must be refused");
    assert.equal(outcome.error.statusCode, 403);
  } finally {
    vehicleModel.findById = originalFindById;
  }
});

test("Company A cannot delete Company B's vehicle by direct ID", async () => {
  const handlers = routeHandlers(vehicleRouter, "/:id", "delete");
  const vehicleModel = mongoose.model("Vehicle");
  const originalFindById = vehicleModel.findById;

  vehicleModel.findById = () => ({
    then: (resolve) => resolve({ _id: vehicleId, companyId: companyB }),
  });

  try {
    const outcome = await runChain(handlers, {
      params: { id: vehicleId },
      user: companyUser(),
      tenantId: companyA,
    });

    assert.ok(outcome.error, "a foreign delete must be refused");
    assert.equal(outcome.error.statusCode, 403);
  } finally {
    vehicleModel.findById = originalFindById;
  }
});

test("updateVehicleRecord scopes the write filter to the caller's tenant", async () => {
  const { captured, restore } = captureWrite("Vehicle", (filter, update) => ({
    _id: filter._id,
    companyId: companyA,
    ...update,
  }));

  try {
    const result = await vehicleService.updateVehicleRecord(
      vehicleId,
      { dailyPrice: 90 },
      companyA,
    );

    assert.equal(captured.length, 1);
    assert.deepEqual(captured[0].filter, { _id: vehicleId, companyId: companyA });
    assert.equal(result.dailyPrice, 90);
  } finally {
    restore();
  }
});

test("updateVehicleStatusById scopes the write filter to the caller's tenant", async () => {
  const { captured, restore } = captureWrite("Vehicle", (filter, update) => ({
    _id: filter._id,
    companyId: companyA,
    ...update,
  }));

  try {
    const result = await vehicleService.updateVehicleStatusById(
      vehicleId,
      "operational",
      "MAINTENANCE",
      companyA,
    );

    assert.equal(captured.length, 1);
    assert.deepEqual(captured[0].filter, { _id: vehicleId, companyId: companyA });
    assert.equal(captured[0].update.operationalStatus, "MAINTENANCE");
    assert.equal(result.operationalStatus, "MAINTENANCE");
  } finally {
    restore();
  }
});

test("softDeleteVehicleById scopes the write filter to the caller's tenant", async () => {
  const { captured, restore } = captureWrite("Vehicle", () => ({
    _id: vehicleId,
    companyId: companyA,
  }));

  try {
    await vehicleService.softDeleteVehicleById(vehicleId, companyA);

    assert.equal(captured.length, 1);
    assert.deepEqual(captured[0].filter, { _id: vehicleId, companyId: companyA });
    assert.ok(captured[0].update.deletedAt instanceof Date);
  } finally {
    restore();
  }
});

test("a tenant-scoped write to another tenant's vehicle resolves as not found", async () => {
  const { restore } = captureWrite("Vehicle", () => null);

  try {
    await assert.rejects(
      () => vehicleService.updateVehicleRecord(vehicleId, { dailyPrice: 90 }, companyA),
      (err) => err.statusCode === 404,
      "a scoped write that hits no tenant-owned row must be reported as 404",
    );
  } finally {
    restore();
  }
});

test("an unscoped vehicle write (admin path) carries no tenant filter", async () => {
  const { captured, restore } = captureWrite("Vehicle", (filter, update) => ({
    _id: filter._id,
    ...update,
  }));

  try {
    await vehicleService.updateVehicleRecord(vehicleId, { dailyPrice: 110 });

    assert.equal(captured.length, 1);
    assert.equal(
      Object.hasOwn(captured[0].filter, "companyId"),
      false,
      "admins pass no tenant scope",
    );
  } finally {
    restore();
  }
});

test("Company A cannot read Company B's booking by direct ID", async () => {
  const handlers = routeHandlers(bookingRouter, "/:id", "get");
  const bookingModel = mongoose.model("Booking");
  const originalFindById = bookingModel.findById;

  bookingModel.findById = () => ({
    then: (resolve) =>
      resolve({
        _id: bookingId,
        companyId: companyB,
        customerId: customerA,
      }),
  });

  try {
    const outcome = await runChain(handlers, {
      params: { id: bookingId },
      user: companyUser(),
      tenantId: companyA,
    });

    assert.ok(outcome.error, "a foreign booking read must be refused");
    assert.equal(outcome.error.statusCode, 403);
  } finally {
    bookingModel.findById = originalFindById;
  }
});

test("Company A cannot cancel Company B's booking by direct ID", async () => {
  const handlers = routeHandlers(bookingRouter, "/:id/cancel", "patch");
  const bookingModel = mongoose.model("Booking");
  const originalFindById = bookingModel.findById;

  bookingModel.findById = () => ({
    then: (resolve) =>
      resolve({
        _id: bookingId,
        companyId: companyB,
        customerId: customerA,
      }),
  });

  try {
    const outcome = await runChain(handlers, {
      params: { id: bookingId },
      body: {},
      user: companyUser(),
      tenantId: companyA,
    });

    assert.ok(outcome.error, "a foreign booking cancel must be refused");
    assert.equal(outcome.error.statusCode, 403);
  } finally {
    bookingModel.findById = originalFindById;
  }
});

test("Company A cannot read Company B's payment by direct ID", async () => {
  const handlers = routeHandlers(paymentRouter, "/:id", "get");
  const paymentModel = mongoose.model("Payment");
  const originalFindById = paymentModel.findById;

  paymentModel.findById = () => ({
    then: (resolve) =>
      resolve({
        _id: paymentId,
        companyId: companyB,
        customerId: customerA,
      }),
  });

  try {
    const outcome = await runChain(handlers, {
      params: { id: paymentId },
      user: companyUser(),
      tenantId: companyA,
    });

    assert.ok(outcome.error, "a foreign payment read must be refused");
    assert.equal(outcome.error.statusCode, 403);
  } finally {
    paymentModel.findById = originalFindById;
  }
});

test("Company A cannot download Company B's invoice by direct ID", async () => {
  const handlers = routeHandlers(paymentRouter, "/:id/invoice", "get");
  const paymentModel = mongoose.model("Payment");
  const originalFindById = paymentModel.findById;
  const originalCompanyFindOne = mongoose.model("Company").findOne;

  paymentModel.findById = () => ({
    then: (resolve) =>
      resolve({
        _id: paymentId,
        companyId: companyB,
        customerId: customerA,
      }),
  });
  mongoose.model("Company").findOne = () => ({
    then: (resolve) => resolve(null),
  });

  try {
    const outcome = await runChain(handlers, {
      params: { id: paymentId },
      user: companyUser(),
      tenantId: companyA,
    });

    assert.ok(outcome.error, "a foreign invoice must be refused");
    assert.equal(outcome.error.statusCode, 403);
    assert.equal(outcome.streamed, false);
  } finally {
    paymentModel.findById = originalFindById;
    mongoose.model("Company").findOne = originalCompanyFindOne;
  }
});

test("Company A cannot collect cash on Company B's payment", async () => {
  const handlers = routeHandlers(paymentRouter, "/:id/collect-cash", "patch");
  const paymentModel = mongoose.model("Payment");
  const originalFindById = paymentModel.findById;

  paymentModel.findById = () => ({
    then: (resolve) =>
      resolve({
        _id: paymentId,
        companyId: companyB,
        customerId: customerA,
      }),
  });

  try {
    const outcome = await runChain(handlers, {
      params: { id: paymentId },
      user: companyUser(),
      tenantId: companyA,
    });

    assert.ok(outcome.error, "a foreign cash collection must be refused");
    assert.equal(outcome.error.statusCode, 403);
  } finally {
    paymentModel.findById = originalFindById;
  }
});

test("a tenant gate reports a missing resource as 404, not forbidden", async () => {
  const gate = verifyTenantAccess("Payment");
  const paymentModel = mongoose.model("Payment");
  const originalFindById = paymentModel.findById;

  paymentModel.findById = () => ({ then: (resolve) => resolve(null) });

  try {
    const outcome = await invoke(gate, {
      params: { id: paymentId },
      user: companyUser(),
      tenantId: companyA,
    });

    assert.ok(outcome.error, "a missing resource must be refused");
    assert.equal(outcome.error.statusCode, 404);
  } finally {
    paymentModel.findById = originalFindById;
  }
});

// ---------------------------------------------------------------------------
// Requirement (b): Company A cannot view or request Company B's payout ledger.
// ---------------------------------------------------------------------------

test("Company A's payout summary is computed against its own tenant, never a query companyId", async () => {
  const paymentModel = mongoose.model("Payment");
  const originalAggregate = paymentModel.aggregate;
  const captured = [];

  paymentModel.aggregate = (pipeline) => {
    captured.push(pipeline);
    return { then: (resolve) => resolve([]) };
  };

  try {
    const outcome = await invoke(getCompanyPayoutSummary, {
      user: companyUser(),
      tenantId: companyA,
      query: { companyId: companyB },
    });

    assert.equal(outcome.statusCode, 200);
    assert.equal(captured.length, 1);
    const match = captured[0][0].$match;
    assert.deepEqual(match.status.$in, [
      "COMPLETED",
      "REFUNDED",
      "PARTIALLY_REFUNDED",
    ]);
    assert.equal(
      match.companyId.toString(),
      companyA,
      "the ledger must stay pinned to tenant A even when ?companyId=B",
    );
  } finally {
    paymentModel.aggregate = originalAggregate;
  }
});

test("a company account without a tenant fails closed instead of seeing every payout ledger", async () => {
  const paymentModel = mongoose.model("Payment");
  const originalAggregate = paymentModel.aggregate;
  let aggregated = false;
  paymentModel.aggregate = () => {
    aggregated = true;
    return { then: (resolve) => resolve([]) };
  };

  try {
    const outcome = await invoke(getCompanyPayoutSummary, {
      user: { _id: customerA, id: customerA, role: "company" },
      tenantId: null,
      query: {},
    });

    assert.ok(outcome.error, "a tenant-less company must be refused");
    assert.equal(outcome.error.statusCode, 403);
    assert.equal(aggregated, false, "no platform-wide aggregation may run");
  } finally {
    paymentModel.aggregate = originalAggregate;
  }
});

test("fetchAllPayments keeps a company ledger pinned to its own tenant", async (t) => {
  const paymentModel = mongoose.model("Payment");
  const sink = {};
  const makeQuery = (docs) => {
    const chain = {
      find: () => chain,
      sort: () => chain,
      select: () => chain,
      skip: () => chain,
      limit: () => chain,
      populate: () => chain,
      then: (resolve) => resolve(docs),
    };
    return chain;
  };
  t.mock.method(paymentModel, "find", (filter) => {
    sink.findFilter = filter;
    return makeQuery([]);
  });
  t.mock.method(paymentModel, "countDocuments", (filter) => {
    sink.countFilter = filter;
    return Promise.resolve(0);
  });

  const result = await paymentService.fetchAllPayments(
    {},
    { role: "company", company: companyA },
    companyA,
  );

  assert.equal(result.payments.length, 0);
  assert.deepEqual(sink.findFilter, { companyId: companyA });
  assert.deepEqual(sink.countFilter, { companyId: companyA });
});

test("fetchAllPayments refuses a company ledger row without any tenant", async () => {
  await assert.rejects(
    () => paymentService.fetchAllPayments({}, { role: "company" }),
    (err) => err.statusCode === 403,
    "a tenant-less company must never fall back to the full ledger",
  );
});

test("getCompanyBookings ignores a query companyId for company sessions", async () => {
  const bookingModel = mongoose.model("Booking");
  const originalFind = bookingModel.find;
  const captured = [];
  bookingModel.find = (filter) => {
    captured.push(filter);
    return { then: (resolve) => resolve([]) };
  };

  try {
    const outcome = await invoke(getCompanyBookings, {
      user: companyUser(),
      tenantId: companyA,
      query: { companyId: companyB },
    });

    assert.equal(outcome.statusCode, 200);
    assert.equal(captured.length, 1);
    assert.deepEqual(captured[0], { companyId: companyA });
  } finally {
    bookingModel.find = originalFind;
  }
});

test("getCompanyVehicles ignores a query companyId for company sessions", async () => {
  const vehicleModel = mongoose.model("Vehicle");
  const originalFind = vehicleModel.find;
  const captured = [];
  const makeQuery = () => {
    const chain = {
      find: () => chain,
      sort: () => chain,
      select: () => chain,
      skip: () => chain,
      limit: () => chain,
      then: (resolve) => resolve([]),
    };
    return chain;
  };
  vehicleModel.find = (filter) => {
    captured.push(filter);
    return makeQuery();
  };

  try {
    const outcome = await invoke(getCompanyVehicles, {
      user: companyUser(),
      tenantId: companyA,
      query: { companyId: companyB },
    });

    assert.equal(outcome.statusCode, 200);
    assert.equal(captured.length, 1);
    assert.deepEqual(captured[0], { companyId: companyA });
  } finally {
    vehicleModel.find = originalFind;
  }
});

// ---------------------------------------------------------------------------
// Requirement (d): an admin bypasses tenant isolation for cross-tenant ops.
// ---------------------------------------------------------------------------

test("verifyTenantAccess lets an admin through to any tenant resource", async () => {
  const gate = verifyTenantAccess("Payment");
  const paymentModel = mongoose.model("Payment");
  const originalFindById = paymentModel.findById;

  paymentModel.findById = () => ({
    then: (resolve) =>
      resolve({ _id: paymentId, companyId: companyB, customerId: customerA }),
  });

  try {
    const outcome = await invoke(gate, {
      params: { id: paymentId },
      user: { _id: adminId, id: adminId, role: "admin" },
      tenantId: null,
    });

    assert.equal(outcome.error, undefined, "an admin must pass the gate");
  } finally {
    paymentModel.findById = originalFindById;
  }
});

test("fetchAllPayments gives an admin the full ledger, unscoped to any tenant", async (t) => {
  const paymentModel = mongoose.model("Payment");
  const sink = {};
  const makeQuery = (docs) => {
    const chain = {
      find: () => chain,
      sort: () => chain,
      select: () => chain,
      skip: () => chain,
      limit: () => chain,
      populate: () => chain,
      then: (resolve) => resolve(docs),
    };
    return chain;
  };
  t.mock.method(paymentModel, "find", (filter) => {
    sink.findFilter = filter;
    return makeQuery([]);
  });
  t.mock.method(paymentModel, "countDocuments", () => Promise.resolve(0));

  await paymentService.fetchAllPayments({}, { role: "admin" });

  assert.deepEqual(sink.findFilter, {});
  assert.equal(sink.findFilter.companyId, undefined);
});

test("an admin may request another company's payout summary via query", async () => {
  const paymentModel = mongoose.model("Payment");
  const originalAggregate = paymentModel.aggregate;
  const captured = [];
  paymentModel.aggregate = (pipeline) => {
    captured.push(pipeline);
    return { then: (resolve) => resolve([]) };
  };

  try {
    const outcome = await invoke(getCompanyPayoutSummary, {
      user: { _id: adminId, id: adminId, role: "admin" },
      tenantId: null,
      query: { companyId: companyB },
    });

    assert.equal(outcome.statusCode, 200);
    assert.equal(captured[0][0].$match.companyId.toString(), companyB);
  } finally {
    paymentModel.aggregate = originalAggregate;
  }
});

test("an admin may scope another company's booking ledger by query", async () => {
  const bookingModel = mongoose.model("Booking");
  const originalFind = bookingModel.find;
  const captured = [];
  const makeQuery = () => {
    const chain = {
      find: () => chain,
      sort: () => chain,
      select: () => chain,
      skip: () => chain,
      limit: () => chain,
      then: (resolve) => resolve([]),
    };
    return chain;
  };
  bookingModel.find = (filter) => {
    captured.push(filter);
    return makeQuery();
  };

  try {
    const outcome = await invoke(getCompanyBookings, {
      user: { _id: adminId, id: adminId, role: "admin" },
      tenantId: null,
      query: { companyId: companyB },
    });

    assert.equal(outcome.statusCode, 200);
    assert.deepEqual(captured[0], { companyId: companyB });
  } finally {
    bookingModel.find = originalFind;
  }
});
