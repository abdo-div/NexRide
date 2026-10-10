import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import User from "../models/User_model.js";
import Company from "../models/Company_model.js";
import adminRouter from "../routes/admin.routes.js";

const userId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const companyId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const jwtSecret = "admin-workflow-authorization-test-secret";

const makeUser = (role, overrides = {}) => ({
  _id: userId,
  id: userId,
  role,
  status: "ACTIVE",
  company: role === "company" ? companyId : null,
  changedPasswordAfter: () => false,
  ...overrides,
});

const getAdminRouteGuards = () => {
  const firstRouteIndex = adminRouter.stack.findIndex((layer) => layer.route);
  assert.ok(firstRouteIndex >= 2, "admin router must mount auth guards before routes");
  return adminRouter.stack.slice(0, firstRouteIndex).map((layer) => layer.handle);
};

const runAdminRouteGuards = async (t, role, token = true) => {
  const [authenticate, authorize] = getAdminRouteGuards();
  const user = role ? makeUser(role) : null;
  t.mock.method(User, "findById", async () => user);
  if (role === "company") {
    t.mock.method(Company, "findById", async () => ({
      _id: companyId,
      status: "APPROVED",
    }));
  }

  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = jwtSecret;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const headers = {};
  if (token) {
    headers.authorization = `Bearer ${jwt.sign({ id: userId }, jwtSecret, {
      expiresIn: "1h",
    })}`;
  }
  const req = { headers, cookies: {} };
  const res = { locals: {} };
  let error;
  let continued = false;
  const next = (nextError) => {
    if (nextError) error = nextError;
    else continued = true;
  };

  await new Promise((resolve) => {
    authenticate(req, res, (nextError) => {
      if (nextError) {
        error = nextError;
        resolve();
      } else {
        resolve();
      }
    });
  });
  if (!error) authorize(req, res, next);
  return { error, continued };
};

test("admin is allowed through the shared guard protecting admin workflows", async (t) => {
  const { error, continued } = await runAdminRouteGuards(t, "admin");

  assert.equal(error, undefined);
  assert.equal(continued, true);
});

test("unauthenticated users are rejected before reaching admin workflows", async (t) => {
  const { error, continued } = await runAdminRouteGuards(t, null, false);

  assert.equal(error.statusCode, 401);
  assert.equal(continued, false);
});

test("customers are rejected before reaching admin workflows", async (t) => {
  const { error, continued } = await runAdminRouteGuards(t, "customer");

  assert.equal(error.statusCode, 403);
  assert.equal(continued, false);
});

test("approved tenant users are rejected before reaching admin workflows", async (t) => {
  const { error, continued } = await runAdminRouteGuards(t, "company");

  assert.equal(error.statusCode, 403);
  assert.equal(continued, false);
});
