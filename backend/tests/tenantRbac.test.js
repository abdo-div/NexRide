import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import vehicleRouter from "../routes/vehicleRoutes.js";
import bookingRouter from "../routes/bookingRoutes.js";
import paymentRouter from "../routes/paymentRoutes.js";
import companyRouter from "../routes/companyRoutes.js";
import { protect } from "../middlewares/authMiddleware.js";
import { getPaymentById } from "../controllers/paymentController.js";
import { createVehicle } from "../controllers/vehicleController.js";
import { updateMyCompany } from "../controllers/companyController.js";

const customerA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const customerB = "bbbbbbbbbbbbbbbbbbbbbbbb";
const companyA = "cccccccccccccccccccccccc";
const companyB = "dddddddddddddddddddddddd";
const vehicleId = "ffffffffffffffffffffffff";
const bookingId = "111111111111111111111111";

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
      setImmediate(resolve);
    });

    if (error) return { error, ...state };
    if (!calledNext) return { ...state };
  }

  return { ...state };
};

// The global auth guard is registered via router.use(protect), so it lives on
// the router stack rather than inside each route's handler list. protect is a
// catchAsync wrapper, so the layers are identified by reference, not by name.
const authGuardIndex = (router) =>
  router.stack.findIndex((item) => item.handle === protect);

// ---------------------------------------------------------------------------
// Requirement (c): route chains are hardened - protect is mounted before any
// tenant business logic, RBAC runs before tenant lookup, the tenant gate runs
// before the controller, and param validation is present and early.
// ---------------------------------------------------------------------------

test("vehicle patch route has protect mounted before the tenant write", () => {
  const protectIdx = authGuardIndex(vehicleRouter);
  assert.ok(protectIdx >= 0, "protect must be registered on the router");

  const patchLayer = vehicleRouter.stack.find(
    (item) => item.route?.path === "/:id" && item.route.methods?.patch,
  );
  const patchIdx = vehicleRouter.stack.indexOf(patchLayer);
  assert.ok(patchIdx > protectIdx, "protect must run before the tenant write");
});

test("booking by-id routes have protect mounted before tenant lookups", () => {
  const protectIdx = authGuardIndex(bookingRouter);
  assert.ok(protectIdx >= 0, "protect must be registered on the router");

  for (const path of ["/:id", "/:id/invoice", "/:id/cancel", "/:id/status"]) {
    const layer = bookingRouter.stack.find(
      (item) =>
        item.route?.path === path &&
        (item.route.methods?.get || item.route.methods?.patch),
    );
    assert.ok(layer, `expected route ${path}`);
    assert.ok(
      bookingRouter.stack.indexOf(layer) > protectIdx,
      `protect must run before ${path}`,
    );
  }
});

test("company self-service and admin routes are mounted after protect", () => {
  const protectIdx = authGuardIndex(companyRouter);
  assert.ok(protectIdx >= 0, "protect must be registered on the company router");

  // router.patch(["/update-my-company", "/updateMyCompany"], ...) registers the
  // path as an array on the route layer.
  const selfUpdateLayer = companyRouter.stack.find(
    (item) =>
      item.route?.methods?.patch &&
      [item.route.path]
        .flat()
        .includes("/update-my-company"),
  );
  assert.ok(selfUpdateLayer, "update-my-company route exists");
  assert.ok(
    companyRouter.stack.indexOf(selfUpdateLayer) > protectIdx,
    "protect must run before the self-service update",
  );
});

test("vehicle update is RBAC-locked before any tenant lookup", async () => {
  const handlers = routeHandlers(vehicleRouter, "/:id", "patch");
  const vehicleModel = mongoose.model("Vehicle");
  const originalFindById = vehicleModel.findById;
  vehicleModel.findById = () => {
    throw new Error("tenant lookup must not run for a forbidden role");
  };

  try {
    const outcome = await runChain(handlers, {
      params: { id: vehicleId },
      body: { dailyPrice: 120 },
      user: { _id: customerA, id: customerA, role: "customer" },
      tenantId: null,
    });

    assert.ok(outcome.error, "a customer must be refused the company action");
    assert.equal(outcome.error.statusCode, 403);
  } finally {
    vehicleModel.findById = originalFindById;
  }
});

test("payment cash collection is RBAC-locked before tenant lookup", async () => {
  const handlers = routeHandlers(paymentRouter, "/:id/collect-cash", "patch");
  const paymentModel = mongoose.model("Payment");
  const originalFindById = paymentModel.findById;
  paymentModel.findById = () => {
    throw new Error("tenant lookup must not run for a forbidden role");
  };

  try {
    const outcome = await runChain(handlers, {
      params: { id: vehicleId },
      user: { _id: customerA, id: customerA, role: "customer" },
      tenantId: null,
    });

    assert.ok(outcome.error, "a customer must be refused the company action");
    assert.equal(outcome.error.statusCode, 403);
  } finally {
    paymentModel.findById = originalFindById;
  }
});

test("booking status update rejects a customer before any tenant lookup", async () => {
  const handlers = routeHandlers(bookingRouter, "/:id/status", "patch");
  const bookingModel = mongoose.model("Booking");
  const originalFindById = bookingModel.findById;
  bookingModel.findById = () => {
    throw new Error("tenant lookup must not run for a forbidden role");
  };

  try {
    const outcome = await runChain(handlers, {
      params: { id: bookingId },
      user: { _id: customerA, id: customerA, role: "customer" },
      tenantId: null,
    });

    assert.ok(outcome.error, "a customer must be refused the company action");
    assert.equal(outcome.error.statusCode, 403);
  } finally {
    bookingModel.findById = originalFindById;
  }
});

test("booking status update runs the tenant gate for an eligible company", async () => {
  const handlers = routeHandlers(bookingRouter, "/:id/status", "patch");
  const bookingModel = mongoose.model("Booking");
  const originalFindById = bookingModel.findById;
  bookingModel.findById = () => ({
    then: (resolve) =>
      resolve({ _id: bookingId, companyId: companyB, customerId: customerB }),
  });

  try {
    const outcome = await runChain(handlers, {
      params: { id: bookingId },
      user: { _id: customerA, id: customerA, role: "company", company: companyA },
      tenantId: companyA,
    });

    assert.ok(outcome.error, "a foreign booking must be refused");
    assert.equal(outcome.error.statusCode, 403);
  } finally {
    bookingModel.findById = originalFindById;
  }
});

test("company commission updates are admin-only before the handler", async () => {
  const handlers = routeHandlers(companyRouter, "/:id/commission", "patch");
  const companyModel = mongoose.model("Company");
  const originalFindByIdAndUpdate = companyModel.findByIdAndUpdate;
  companyModel.findByIdAndUpdate = () => {
    throw new Error("a company user must never reach the commission writer");
  };

  try {
    const outcome = await runChain(handlers, {
      params: { id: companyA },
      body: { commissionRate: 5 },
      user: { _id: customerA, id: customerA, role: "company", company: companyA },
      tenantId: companyA,
    });

    assert.ok(outcome.error, "a company user must be refused the admin action");
    assert.equal(outcome.error.statusCode, 403);
  } finally {
    companyModel.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

test("booking read routes mount param validation before the tenant gate", async () => {
  const bookingModel = mongoose.model("Booking");
  const originalFindById = bookingModel.findById;
  bookingModel.findById = () => {
    throw new Error("an unvalidated id must never reach the model");
  };

  const paths = [
    ["/:id", "get"],
    ["/:id/invoice", "get"],
    ["/:id/cancel", "patch"],
  ];

  try {
    for (const [path, method] of paths) {
      const handlers = routeHandlers(bookingRouter, path, method);
      const outcome = await runChain(handlers, {
        params: { id: "not-an-object-id" },
        body: {},
        user: { _id: customerA, id: customerA, role: "company", company: companyA },
        tenantId: companyA,
      });

      assert.equal(
        outcome.statusCode,
        400,
        `malformed id on ${method.toUpperCase()} ${path} must be rejected by validation`,
      );
      assert.equal(outcome.error, undefined);
    }
  } finally {
    bookingModel.findById = originalFindById;
  }
});

test("the tenant gate runs before the controller on the payment detail route", async () => {
  const handlers = routeHandlers(paymentRouter, "/:id", "get");
  assert.equal(
    handlers[handlers.length - 1],
    getPaymentById,
    "the controller must be the last handler in the chain",
  );

  const paymentModel = mongoose.model("Payment");
  const originalFindById = paymentModel.findById;
  paymentModel.findById = () => ({
    then: (resolve) =>
      resolve({
        _id: vehicleId,
        companyId: companyB,
        customerId: customerB,
      }),
  });

  try {
    const outcome = await runChain(handlers, {
      params: { id: vehicleId },
      user: { _id: customerA, id: customerA, role: "company", company: companyA },
      tenantId: companyA,
    });

    assert.ok(outcome.error, "the gate must reject before the controller runs");
    assert.equal(outcome.error.statusCode, 403);
  } finally {
    paymentModel.findById = originalFindById;
  }
});

// ---------------------------------------------------------------------------
// Requirement (c) + (1): tenant context is derived from the session - a company
// user can never steer ownership through the request payload.
// ---------------------------------------------------------------------------

test("a company user cannot create a vehicle in another tenant via body companyId", async () => {
  const vehicleModel = mongoose.model("Vehicle");
  const originalCreate = vehicleModel.create;
  const captured = [];

  vehicleModel.create = async (data) => {
    captured.push(data);
    return { _id: vehicleId, ...data };
  };

  try {
    const outcome = await invoke(createVehicle, {
      body: { companyId: companyB },
      files: undefined,
      user: { _id: customerA, id: customerA, role: "company", company: companyA },
      tenantId: companyA,
    });

    assert.equal(outcome.statusCode, 201);
    assert.equal(captured.length, 1);
    assert.equal(
      captured[0].companyId.toString(),
      companyA,
      "the payload's companyId must be ignored for a company session",
    );
  } finally {
    vehicleModel.create = originalCreate;
  }
});

test("an admin may assign a vehicle to any company via body companyId", async () => {
  const vehicleModel = mongoose.model("Vehicle");
  const originalCreate = vehicleModel.create;
  const captured = [];

  vehicleModel.create = async (data) => {
    captured.push(data);
    return { _id: vehicleId, ...data };
  };

  try {
    const outcome = await invoke(createVehicle, {
      body: { companyId: companyB },
      files: undefined,
      user: { _id: "999999999999999999999999", id: "999999999999999999999999", role: "admin" },
      tenantId: null,
    });

    assert.equal(outcome.statusCode, 201);
    assert.equal(captured.length, 1);
    assert.equal(captured[0].companyId.toString(), companyB);
  } finally {
    vehicleModel.create = originalCreate;
  }
});

test("company self-profile updates are bound to the caller's tenant", async () => {
  const companyModel = mongoose.model("Company");
  const originalFindByIdAndUpdate = companyModel.findByIdAndUpdate;
  const captured = { ids: [] };

  companyModel.findByIdAndUpdate = (id, update) => {
    captured.ids.push(String(id));
    return { then: (resolve) => resolve({ _id: id, name: update.name }) };
  };

  try {
    const outcome = await invoke(updateMyCompany, {
      body: { name: "Tenant A Cars" },
      query: { companyId: companyB },
      user: { _id: customerA, id: customerA, role: "company", company: companyA },
      tenantId: companyA,
    });

    assert.equal(outcome.statusCode, 200);
    assert.equal(captured.ids.length, 1);
    assert.equal(
      captured.ids[0],
      companyA,
      "the update target must be the session tenant, never a query companyId",
    );
  } finally {
    companyModel.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
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
      setHeader() {
        return this;
      },
      end() {
        resolve({ statusCode, body: undefined });
      },
    };
    handler(req, res, (error) => {
      if (error) resolve({ error, statusCode });
      else resolve({ statusCode, body: undefined });
    });
  });