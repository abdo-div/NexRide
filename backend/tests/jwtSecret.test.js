import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import User from "../models/User_model.js";
import { getJwtSecret, validateJwtSecret } from "../config/jwt.js";
import { protect } from "../middlewares/authMiddleware.js";
import { signToken } from "../services/authService.js";

const testSecret = "jwt-secret-regression-test-value-with-32-bytes-minimum";
const userId = "aaaaaaaaaaaaaaaaaaaaaaaa";

const withJwtSecret = (t, secret = testSecret) => {
  const previousSecret = process.env.JWT_SECRET;
  const previousExpiration = process.env.JWT_EXPIRES_IN;
  process.env.JWT_SECRET = secret;
  process.env.JWT_EXPIRES_IN = "1h";
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousExpiration === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = previousExpiration;
  });
};

test("startup validation fails clearly when JWT_SECRET is missing", () => {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", "await import('./server.js')"],
    {
      cwd: process.cwd(),
      env: { ...process.env, JWT_SECRET: "" },
      encoding: "utf8",
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /JWT_SECRET is required/);
  assert.doesNotMatch(result.stderr, new RegExp(testSecret));
});

test("JWT secret validation rejects secrets shorter than 32 bytes", (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "too-short";
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  assert.throws(() => validateJwtSecret(), /at least 32 bytes/);
  assert.throws(() => getJwtSecret(), /at least 32 bytes/);
});

test("a configured JWT_SECRET signs and verifies tokens", (t) => {
  withJwtSecret(t);

  const token = signToken(userId);
  const decoded = jwt.verify(token, testSecret);

  assert.equal(decoded.id, userId);
  assert.ok(decoded.exp > decoded.iat);
});

test("a token signed with an incorrect secret is rejected", (t) => {
  withJwtSecret(t);
  const token = jwt.sign({ id: userId }, "incorrect-signing-key-for-regression-test");

  assert.throws(() => jwt.verify(token, getJwtSecret()), /invalid signature/);
});

test("protected authentication does not verify tokens when JWT_SECRET is missing", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const token = jwt.sign({ id: userId }, "attacker-chosen-key-for-regression-test");
  const findUser = t.mock.method(User, "findById", async () => ({
    _id: userId,
    id: userId,
    status: "ACTIVE",
    role: "customer",
    changedPasswordAfter: () => false,
  }));
  const result = await new Promise((resolve) =>
    protect(
      { headers: { authorization: `Bearer ${token}` }, cookies: {} },
      { locals: {} },
      (error) => resolve({ error }),
    ),
  );

  assert.match(result.error.message, /JWT_SECRET is required/);
  assert.equal(findUser.mock.callCount(), 0);
});

test("protected authentication accepts a valid token signed with configured JWT_SECRET", async (t) => {
  withJwtSecret(t);
  const user = {
    _id: userId,
    id: userId,
    status: "ACTIVE",
    role: "customer",
    changedPasswordAfter: () => false,
  };
  t.mock.method(User, "findById", async () => user);
  const token = signToken(userId);

  const result = await new Promise((resolve) =>
    protect(
      { headers: { authorization: `Bearer ${token}` }, cookies: {} },
      { locals: {} },
      (error) => resolve({ error }),
    ),
  );

  assert.equal(result.error, undefined);
});