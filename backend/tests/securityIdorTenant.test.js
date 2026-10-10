import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import paymentRouter from "../routes/paymentRoutes.js";
import vehicleRouter from "../routes/vehicleRoutes.js";
import { downloadInvoicePDF } from "../controllers/paymentController.js";
import { updateVehicle } from "../controllers/vehicleController.js";
import { verifyTenantAccess } from "../middlewares/authMiddleware.js";
import { assertInvoiceAccess } from "../services/paymentService.js";
import * as vehicleService from "../services/vehicleService.js";

const customerA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const customerB = "bbbbbbbbbbbbbbbbbbbbbbbb";
const companyA = "cccccccccccccccccccccccc";
const companyB = "dddddddddddddddddddddddd";
const paymentId = "eeeeeeeeeeeeeeeeeeeeeeee";
const vehicleId = "ffffffffffffffffffffffff";

const makePayment = (overrides = {}) => ({
  _id: paymentId,
  customerId: customerA,
  companyId: companyA,
  bookingId: "111111111111111111111111",
  amount: 100,
  ...overrides,
});

const makeUser = (overrides = {}) => ({
  _id: customerA,
  id: customerA,
  role: "customer",
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

// Runs the middleware chain and reports what the handler did, without needing a
// real HTTP server or database.
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
      // The PDF generator writes the stream directly; record and end it.
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

// Walk a route's middleware chain in order the way express does, so a test can
// prove the gate runs before the handler rather than only that it exists.
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

// ---------------------------------------------------------------------------
// P1-1: invoice IDOR
// ---------------------------------------------------------------------------

test("the invoice route rejects a foreign payment before streaming anything", async () => {
  const handlers = routeHandlers(paymentRouter, "/:id/invoice", "get");

  const originalFindById = mongoose.model("Payment").findById;
  const originalCompanyFindOne = mongoose.model("Company").findOne;

  mongoose.model("Payment").findById = () => ({
    then: (resolve) =>
      resolve({
        _id: paymentId,
        customerId: customerB,
        companyId: companyB,
        bookingId: "111111111111111111111111",
      }),
  });
  // A customer owns no company; without this the gate falls through to a real
  // Company query and blocks on mongoose buffering.
  mongoose.model("Company").findOne = () => ({
    then: (resolve) => resolve(null),
  });

  try {
    const outcome = await runChain(handlers, {
      params: { id: paymentId },
      user: { _id: customerA, id: customerA, role: "customer" },
      tenantId: null,
    });

    assert.ok(outcome.error, "a foreign invoice request must be refused");
    assert.equal(outcome.error.statusCode, 403);
    assert.equal(
      outcome.streamed,
      false,
      "no PDF bytes may be written for an unauthorized request",
    );
  } finally {
    mongoose.model("Payment").findById = originalFindById;
    mongoose.model("Company").findOne = originalCompanyFindOne;
  }
});

test("the invoice route serves the owning customer's invoice", async () => {
  const handlers = routeHandlers(paymentRouter, "/:id/invoice", "get");

  const originalFindById = mongoose.model("Payment").findById;
  mongoose.model("Payment").findById = () => ({
    populate: () => ({
      populate: () => ({
        populate: () => ({
          then: (resolve) =>
            resolve({
              _id: paymentId,
              customerId: customerA,
              companyId: companyA,
              bookingId: "111111111111111111111111",
            }),
        }),
      }),
    }),
  });

  // Stop the chain at the gate: PDF generation needs a real booking document,
  // and access control is what this test is about.
  const uptoGate = handlers.slice(0, 2);

  try {
    const outcome = await runChain(uptoGate, {
      params: { id: paymentId },
      user: { _id: customerA, id: customerA, role: "customer" },
      tenantId: null,
    });

    assert.equal(
      outcome.error,
      undefined,
      "the paying customer must pass the gate",
    );
    assert.equal(outcome.statusCode, 200);
  } finally {
    mongoose.model("Payment").findById = originalFindById;
  }
});

test("a customer cannot download another customer's invoice", async () => {
  const payment = makePayment({ customerId: customerB });

  // The guard is synchronous and throws; assert.throws is the matching form.
  assert.throws(
    () => assertInvoiceAccess(payment, makeUser(), null),
    (err) => err.statusCode === 403,
    "customer A must be denied customer B's invoice",
  );
});

test("a customer cannot download another company's invoice", async () => {
  const payment = makePayment({ customerId: customerB, companyId: companyB });

  assert.throws(
    () =>
      assertInvoiceAccess(
        payment,
        makeUser({ role: "company", company: companyA }),
        companyA,
      ),
    (err) => err.statusCode === 403,
    "company A must be denied company B's invoice",
  );
});

test("a customer can download their own invoice", () => {
  const payment = makePayment();

  assert.equal(
    assertInvoiceAccess(payment, makeUser(), null),
    payment,
  );
});

test("an admin can download any invoice", () => {
  const payment = makePayment({ customerId: customerB, companyId: companyB });
  const admin = makeUser({ _id: "999999999999999999999999", id: "999999999999999999999999", role: "admin" });

  assert.equal(assertInvoiceAccess(payment, admin, null), payment);
});

test("the owning company can download its invoice", () => {
  const payment = makePayment();
  const companyUser = makeUser({
    role: "company",
    _id: customerB,
    id: customerB,
    company: companyA,
  });

  assert.equal(
    assertInvoiceAccess(payment, companyUser, companyA),
    payment,
  );
});

test("invoice ownership survives populated customer references", async () => {
  // fetchPaymentById populates customerId, so the guard must read through the
  // populated document rather than assuming a bare ObjectId.
  const payment = makePayment({
    customerId: { _id: customerA, name: "Customer A", email: "a@example.com" },
  });

  assert.equal(assertInvoiceAccess(payment, makeUser(), null), payment);

  const other = makePayment({
    customerId: { _id: customerB, name: "Customer B", email: "b@example.com" },
  });
  assert.throws(
    () => assertInvoiceAccess(other, makeUser(), null),
    (err) => err.statusCode === 403,
  );
});

test("the invoice handler enforces ownership even without the route gate", async () => {
  // Defence in depth: calling the handler directly, which is how the IDOR
  // reached the PDF before, must still be denied and write no bytes.
  const outcome = await invoke(downloadInvoicePDF, {
    params: { id: paymentId },
    user: makeUser(),
    tenantId: null,
    payment: makePayment({ customerId: customerB }),
    route: { path: "/:id/invoice" },
  });

  assert.ok(outcome.error, "unauthorized invoice download must be rejected");
  assert.equal(outcome.error.statusCode, 403);
  assert.equal(
    outcome.streamed,
    false,
    "no PDF bytes may be written for an unauthorized request",
  );
});

test("invoice access is denied without a user context", () => {
  assert.throws(
    () => assertInvoiceAccess(makePayment(), null, null),
    (err) => err.statusCode === 401,
  );
});

test("a missing payment is reported as not found, not forbidden", () => {
  assert.throws(
    () => assertInvoiceAccess(null, makeUser(), null),
    (err) => err.statusCode === 404,
  );
});

// ---------------------------------------------------------------------------
// P1-2: cross-tenant vehicle reassignment
// ---------------------------------------------------------------------------

test("updateVehicleSchema strips a companyId from the payload", async () => {
  const { updateVehicleSchema } = await import(
    "../validations/vehicle.validation.js"
  );

  const result = updateVehicleSchema.safeParse({
    body: { dailyPrice: 120, companyId: companyB },
  });

  // Zod strips unknown keys rather than erroring. Either behaviour is safe; what
  // matters is that companyId never reaches the controller.
  assert.equal(result.success, true);
  assert.equal(
    Object.hasOwn(result.data.body, "companyId"),
    false,
    "companyId must not survive validation",
  );
  assert.equal(result.data.body.dailyPrice, 120);
});

test("updateVehicleSchema still accepts legitimate field updates", async () => {
  const { updateVehicleSchema } = await import(
    "../validations/vehicle.validation.js"
  );

  const result = updateVehicleSchema.safeParse({
    body: { dailyPrice: 120, description: "Updated" },
  });

  assert.equal(result.success, true);
  assert.equal(result.data.body.dailyPrice, 120);
  assert.equal(Object.hasOwn(result.data.body, "companyId"), false);
});

test("updateVehicleRecord discards an injected companyId", async () => {
  // The service is the real enforcement point: it must never persist a
  // companyId even if a caller bypasses validation.
  const captured = [];
  const original = vehicleService.updateVehicleRecord;
  const vehicleModel = mongoose.model("Vehicle");
  const originalFindOneAndUpdate = vehicleModel.findOneAndUpdate;

  vehicleModel.findOneAndUpdate = (filter, update, options) => {
    captured.push({ filter, update, options });
    return {
      then: (resolve) =>
        resolve({
          _id: filter._id,
          companyId: companyA,
          ...update,
        }),
    };
  };

  try {
    await vehicleService.updateVehicleRecord(vehicleId, {
      dailyPrice: 120,
      companyId: companyB,
    });

    assert.equal(captured.length, 1);
    assert.equal(
      Object.hasOwn(captured[0].update, "companyId"),
      false,
      "companyId must be stripped before persistence",
    );
    assert.equal(captured[0].update.dailyPrice, 120);
  } finally {
    vehicleModel.findOneAndUpdate = originalFindOneAndUpdate;
    assert.equal(vehicleService.updateVehicleRecord, original);
  }
});

test("a company user cannot move a vehicle into another tenant via the handler", async () => {
  const captured = [];
  const vehicleModel = mongoose.model("Vehicle");
  const originalFindOneAndUpdate = vehicleModel.findOneAndUpdate;

  vehicleModel.findOneAndUpdate = (filter, update) => {
    captured.push({ filter, update });
    return {
      then: (resolve) =>
        resolve({ _id: filter._id, companyId: companyA, ...update }),
    };
  };

  try {
    const outcome = await invoke(updateVehicle, {
      params: { id: vehicleId },
      // Payload smuggles competitor B's companyId past the zod schema, which
      // is exactly how the bypass worked before.
      body: { dailyPrice: 120, companyId: companyB },
      user: { _id: customerA, id: customerA, role: "company", company: companyA },
      tenantId: companyA,
    });

    assert.equal(outcome.statusCode, 200);
    assert.equal(captured.length, 1);
    assert.deepEqual(captured[0].filter, { _id: vehicleId, companyId: companyA });
    assert.equal(
      Object.hasOwn(captured[0].update, "companyId"),
      false,
      "the vehicle must keep its verified tenant",
    );
    assert.equal(
      outcome.body.data.vehicle.companyId,
      companyA,
      "ownership must remain with the original company",
    );
  } finally {
    vehicleModel.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("the vehicle patch route refuses to touch another tenant's vehicle", async () => {
  const handlers = routeHandlers(vehicleRouter, "/:id", "patch");

  const vehicleModel = mongoose.model("Vehicle");
  const originalFindById = vehicleModel.findById;
  const originalFindOneAndUpdate = vehicleModel.findOneAndUpdate;
  let writes = 0;

  vehicleModel.findById = () => ({
    then: (resolve) => resolve({ _id: vehicleId, companyId: companyB }),
  });
  vehicleModel.findOneAndUpdate = () => {
    writes += 1;
    return { then: (resolve) => resolve({ _id: vehicleId, companyId: companyB }) };
  };

  try {
    const outcome = await runChain(handlers, {
      params: { id: vehicleId },
      body: { dailyPrice: 120, companyId: companyB },
      user: {
        _id: customerA,
        id: customerA,
        role: "company",
        company: companyA,
      },
      tenantId: companyA,
    });

    assert.ok(outcome.error, "a foreign vehicle update must be refused");
    assert.equal(outcome.error.statusCode, 403);
    assert.equal(
      writes,
      0,
      "no write may be attempted against another tenant's vehicle",
    );
  } finally {
    vehicleModel.findById = originalFindById;
    vehicleModel.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("a company user cannot read another tenant's vehicle", async () => {
  // Confirms the gate the update route relies on actually rejects a foreign
  // vehicle, rather than merely being present in the stack.
  const originalFindById = mongoose.model("Vehicle").findById;
  mongoose.model("Vehicle").findById = () => ({
    then: (resolve) => resolve({ _id: vehicleId, companyId: companyB }),
  });

  try {
    const gate = verifyTenantAccess("Vehicle");
    const outcome = await invoke(gate, {
      params: { id: vehicleId },
      user: {
        _id: customerA,
        id: customerA,
        role: "company",
        company: companyA,
      },
      tenantId: companyA,
    });

    assert.ok(outcome.error, "a foreign vehicle must be rejected");
    assert.equal(outcome.error.statusCode, 403);
  } finally {
    mongoose.model("Vehicle").findById = originalFindById;
  }
});

