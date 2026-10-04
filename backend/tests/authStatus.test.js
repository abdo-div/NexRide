import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import Company from "../models/Company_model.js";
import User from "../models/User_model.js";
import { protect } from "../middlewares/authMiddleware.js";

const userId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const companyId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const jwtSecret = "auth-status-regression-test-secret";

const makeUser = (overrides = {}) => ({
  _id: userId,
  id: userId,
  role: "customer",
  status: "ACTIVE",
  company: null,
  changedPasswordAfter: () => false,
  ...overrides,
});

const withJwtSecret = (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = jwtSecret;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
};

const runProtectedRequest = async (
  user,
  t,
  company = null,
  afterTokenIssued = () => {},
) => {
  t.mock.method(User, "findById", async () => user);
  if (company) t.mock.method(Company, "findById", async () => company);

  const token = jwt.sign({ id: userId }, jwtSecret, { expiresIn: "1h" });
  afterTokenIssued();
  const req = {
    headers: { authorization: `Bearer ${token}` },
    cookies: {},
  };

  const result = await new Promise((resolve) =>
    protect(req, { locals: {} }, (error) => resolve({ error, req })),
  );
  return result;
};

test("an active user with a valid JWT is authenticated", async (t) => {
  withJwtSecret(t);
  const user = makeUser();

  const { error, req } = await runProtectedRequest(user, t);

  assert.equal(error, undefined);
  assert.equal(req.user, user);
});

test("a suspended user is rejected when an old JWT is reused", async (t) => {
  withJwtSecret(t);
  const user = makeUser();

  const { error } = await runProtectedRequest(user, t, null, () => {
    user.status = "SUSPENDED";
  });

  assert.equal(error.statusCode, 403);
  assert.equal(error.message, "Your account is not active. Please contact support.");
});

test("a banned user is rejected when an old JWT is reused", async (t) => {
  withJwtSecret(t);
  const user = makeUser();

  const { error } = await runProtectedRequest(user, t, null, () => {
    user.status = "BANNED";
  });

  assert.equal(error.statusCode, 403);
  assert.equal(error.message, "Your account is not active. Please contact support.");
});

test("password-changed tokens remain rejected", async (t) => {
  withJwtSecret(t);
  const user = makeUser({ changedPasswordAfter: () => true });

  const { error } = await runProtectedRequest(user, t);

  assert.equal(error.statusCode, 401);
  assert.equal(error.message, "User recently changed password! Please log in again.");
});

test("tokens for deleted or nonexistent users remain rejected", async (t) => {
  withJwtSecret(t);
  t.mock.method(User, "findById", async () => null);
  const token = jwt.sign({ id: userId }, jwtSecret, { expiresIn: "1h" });

  const { error } = await new Promise((resolve) =>
    protect(
      { headers: { authorization: `Bearer ${token}` }, cookies: {} },
      { locals: {} },
      (nextError) => resolve({ error: nextError }),
    ),
  );

  assert.equal(error.statusCode, 401);
  assert.equal(error.message, "The user belonging to this token no longer exists.");
});

test("approved company users retain tenant access", async (t) => {
  withJwtSecret(t);
  const user = makeUser({ role: "company", company: companyId });
  const company = { _id: companyId, status: "APPROVED" };

  const { error, req } = await runProtectedRequest(user, t, company);

  assert.equal(error, undefined);
  assert.equal(req.tenantId, companyId);
});

test("suspended or pending companies cannot use old company-user tokens", async (t) => {
  for (const status of ["SUSPENDED", "PENDING"]) {
    await t.test(`company status ${status} is blocked`, async (t) => {
      withJwtSecret(t);
      const user = makeUser({ role: "company", company: companyId });
      const company = { _id: companyId, status: "APPROVED" };

      const { error } = await runProtectedRequest(user, t, company, () => {
        company.status = status;
      });

      assert.equal(error.statusCode, 403);
      assert.equal(error.message, "Your company is not approved or is suspended.");
    });
  }
});