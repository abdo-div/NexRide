import assert from "node:assert/strict";
import { test } from "node:test";
import Email from "../utils/email.js";
import User from "../models/User_model.js";
import Company from "../models/Company_model.js";
import * as authService from "../services/authService.js";
import { getClientUrl, resolveClientUrl } from "../config/clientUrl.js";
import { forgotPassword } from "../controllers/authController.js";

/**
 * P1-7: password-reset link host-header poisoning.
 *
 * `resolveClientUrl(reqHost, reqProtocol)` used to fall back to the request's
 * Host header whenever FRONTEND_URL was unset, and `.env.example` shipped it
 * commented out, so "unset" was the default state. Anyone able to send
 * `POST /users/forgot-password` with `Host: attacker.example` received a mail,
 * sent from the real SMTP relay, containing a live reset token on the
 * attacker's domain. The victim clicks a legitimate-looking link and the token
 * is captured on submit.
 */

const withEnv = (t, values) => {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
};

/**
 * Runs the real forgotPassword controller over a fake req/res whose host data is
 * attacker-controlled, and captures the URL handed to the mailer.
 */
const captureResetUrl = async (t, { env, host, forwardedHost }) => {
  withEnv(t, {
    NODE_ENV: "production",
    FRONTEND_URL: env.frontendUrl,
    ...(env.extra ?? {}),
  });

  const resetToken = "aaaaaaaaaaaaaaaabbbbbbbbbbbbbbbb";
  t.mock.method(User, "findOne", async () => ({
    createPasswordResetToken: () => resetToken,
    save: async () => {},
    passwordResetToken: undefined,
    passwordResetExpires: undefined,
  }));

  let sentUrl = null;
  t.mock.method(Email.prototype, "sendPasswordReset", async function () {
    sentUrl = this.url;
  });

  const req = {
    body: { identifier: "victim@example.com" },
    get: (name) => (name.toLowerCase() === "host" ? host : undefined),
    protocol: "http",
    secure: false,
    headers: {
      host,
      ...(forwardedHost ? { "x-forwarded-host": forwardedHost } : {}),
    },
  };

  let statusCode = null;
  let payload = null;
  const res = {
    cookie: () => {},
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };

  // catchAsync discards its promise and forwards rejections to next(), so
  // awaiting the controller returns before the handler settles. Resolve on
  // whichever of res.json / next fires first.
  let forwardedError = null;
  const done = new Promise((resolve) => {
    let settled = false;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      forwardedError = err ?? null;
      resolve();
    };
    res.json = (body) => {
      payload = body;
      finish(null);
      return res;
    };
    forgotPassword(req, res, finish);
  });

  await done;

  if (forwardedError) return { url: null, error: forwardedError };
  assert.equal(statusCode, 200);
  assert.equal(payload.status, "success");
  return { url: sentUrl, error: null };
};

test("P1-7 forgotPassword ignores a forged Host header when FRONTEND_URL is set", async (t) => {
  const { url, error } = await captureResetUrl(t, {
    env: { frontendUrl: "https://app.nexride.example" },
    host: "attacker.example",
  });

  assert.equal(error, null);
  assert.ok(
    url.startsWith("https://app.nexride.example/reset-password/"),
    `expected the configured frontend origin, received: ${url}`,
  );
  assert.doesNotMatch(url, /attacker\.example/);
});

test("P1-7 forgotPassword ignores X-Forwarded-Host poisoning", async (t) => {
  const { url, error } = await captureResetUrl(t, {
    env: { frontendUrl: "https://app.nexride.example" },
    host: "api.nexride.example",
    forwardedHost: "attacker.example",
  });

  assert.equal(error, null);
  assert.ok(url.startsWith("https://app.nexride.example/reset-password/"));
  assert.doesNotMatch(url, /attacker\.example/);
});

test("P1-7 forgotPassword never reads a host from the request object", async (t) => {
  withEnv(t, { NODE_ENV: "production", FRONTEND_URL: "https://app.nexride.example" });

  // A req whose host accessors are traps: reading them would throw, proving the
  // controller no longer consults request host data at all.
  const boom = () => {
    throw new Error("request host must not be read");
  };
  const user = {
    createPasswordResetToken: () => "reset-token-value-for-regression",
    save: async () => {},
  };
  t.mock.method(User, "findOne", async () => user);

  let sentUrl = null;
  t.mock.method(Email.prototype, "sendPasswordReset", async function () {
    sentUrl = this.url;
  });

  let forwardedError = null;
  await new Promise((resolve) => {
    let settled = false;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      forwardedError = err ?? null;
      resolve();
    };
    forgotPassword(
      {
        body: { identifier: "victim@example.com" },
        get: boom,
        protocol: "http",
        secure: false,
        hostname: boom,
        headers: {},
      },
      {
        cookie: () => {},
        status: () => ({ json: (body) => (finish(null), { body }) }),
      },
      finish,
    );
  });

  assert.equal(forwardedError, null);
  assert.ok(sentUrl.startsWith("https://app.nexride.example/reset-password/"));
});

test("P1-7 FRONTEND_URL unset in production fails closed instead of using the Host header", async (t) => {
  const { url, error } = await captureResetUrl(t, {
    env: { frontendUrl: undefined },
    host: "attacker.example",
  });

  // No email is dispatched, so there is no link to poison. The failure surfaces
  // as a 500 rather than silently mailing a token to the attacker's domain.
  assert.equal(url, null);
  assert.ok(error, "expected the reset to fail closed");
  assert.equal(error.statusCode, 500);
  assert.throws(
    () => getClientUrl({ allowLocalFallback: false }),
    /FRONTEND_URL is required/,
  );
});

test("P1-7 the local fallback is a loopback address, never the request host", (t) => {
  withEnv(t, { NODE_ENV: "development", FRONTEND_URL: undefined });

  assert.equal(resolveClientUrl(), "http://localhost:5173");
  assert.equal(getClientUrl({ allowLocalFallback: true }), "http://localhost:5173");
});

test("P1-7 non-http FRONTEND_URL values are rejected", (t) => {
  withEnv(t, { NODE_ENV: "production" });

  for (const bad of ["javascript:alert(1)", "//attacker.example", "not-a-url"]) {
    process.env.FRONTEND_URL = bad;
    assert.throws(
      () => getClientUrl({ allowLocalFallback: false }),
      /absolute http\(s\) URL|must use http or https/,
      `expected "${bad}" to be rejected`,
    );
  }
});

test("P1-7 trailing slashes and surrounding whitespace are normalised", (t) => {
  withEnv(t, { NODE_ENV: "production", FRONTEND_URL: "  https://app.nexride.example//  " });

  assert.equal(getClientUrl(), "https://app.nexride.example");
});

test("P1-7 signup no longer accepts request host data", async (t) => {
  withEnv(t, { NODE_ENV: "production", FRONTEND_URL: "https://app.nexride.example" });

  t.mock.method(User, "create", async (data) => data);
  let welcomeUrl = null;
  t.mock.method(Email.prototype, "sendWelcome", async function () {
    welcomeUrl = this.url;
  });

  const user = await authService.registerUser({
    name: "Test Customer",
    email: "welcome@example.com",
    password: "password123",
    passwordConfirm: "password123",
    phoneNumber: "+218912345678",
    role: "customer",
  });

  assert.equal(user.role, "customer");
  assert.ok(
    welcomeUrl === null || String(welcomeUrl).startsWith("https://app.nexride.example"),
    `welcome mail must use the configured origin, received: ${welcomeUrl}`,
  );
});

const companyUser = () => ({
  role: "company",
  company: "600000000000000000000000",
  async correctPassword() {
    return true;
  },
});

test("partner sign-in is blocked while the company application is PENDING or REJECTED", async (t) => {
  for (const status of ["PENDING", "REJECTED", "SUSPENDED"]) {
    t.mock.method(User, "findOne", () => ({ select: async () => companyUser() }));
    t.mock.method(Company, "findById", () => ({
      select: () => ({ lean: async () => ({ status }) }),
    }));

    await assert.rejects(
      authService.authenticateUser("partner@example.com", "password123"),
      (err) =>
        err.statusCode === 403 && /still under review/.test(err.message),
      `company status ${status} must be blocked from signing in`,
    );
  }
});

test("partner sign-in is blocked when no company record exists yet", async (t) => {
  t.mock.method(User, "findOne", () => ({ select: async () => companyUser() }));
  t.mock.method(Company, "findById", () => ({
    select: () => ({ lean: async () => null }),
  }));

  await assert.rejects(
    authService.authenticateUser("partner@example.com", "password123"),
    (err) => err.statusCode === 403,
  );
});

test("partner sign-in is allowed only after the admin approves the company", async (t) => {
  t.mock.method(User, "findOne", () => ({ select: async () => companyUser() }));
  t.mock.method(Company, "findById", () => ({
    select: () => ({ lean: async () => ({ status: "APPROVED" }) }),
  }));

  const user = await authService.authenticateUser(
    "partner@example.com",
    "password123",
  );
  assert.equal(user.role, "company");
});

test("customer sign-in is unaffected by the partner approval gate", async (t) => {
  const customer = {
    role: "customer",
    async correctPassword() {
      return true;
    },
  };
  t.mock.method(User, "findOne", () => ({ select: async () => customer }));

  const user = await authService.authenticateUser(
    "customer@example.com",
    "password123",
  );
  assert.equal(user.role, "customer");
});
