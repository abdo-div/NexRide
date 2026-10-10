import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { apiLimiter, authLimiter } from "../middlewares/rateLimitMiddleware.js";
import globalErrorHandler from "../middlewares/errorMiddleware.js";
import AppError from "../utils/appError.js";
import {
  ALLOWED_NODE_ENVS,
  getNodeEnv,
  isDevelopment,
  isProduction,
  validateNodeEnv,
} from "../config/env.js";

/**
 * P1-8: fragile NODE_ENV security controls.
 *
 * errorMiddleware gated stack-trace suppression on `NODE_ENV === "production"`
 * and rateLimitMiddleware skipped both limiters on
 * `NODE_ENV === "development"`. Those checks were exact-match against
 * unvalidated input, so a typo such as "prod", "Production" or "staging", or a
 * missing variable, opened both gates at once: full serialized stack traces
 * (file paths, dependency versions, query values) went to API clients and every
 * rate limiter went dark across all API paths.
 *
 * Both controls now fail closed: hardened unless the run is exactly
 * "development", and an unrecognised NODE_ENV stops the boot.
 */

const withNodeEnv = (t, value) => {
  const previous = process.env.NODE_ENV;
  if (value === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = value;
  t.after(() => {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  });
};

/**
 * Builds a minimal app that reproduces the error middleware's NODE_ENV branch
 * and returns the serialized body it would send to a client.
 */
const renderError = async (t, nodeEnv, err) => {
  withNodeEnv(t, nodeEnv);

  // The hardened path logs the full error server-side, which is the behaviour
  // under test. Capture it instead of letting it reach the test output, and
  // assert it was called so the "hidden from client, kept in logs" split stays
  // verified.
  const logged = [];
  t.mock.method(console, "error", (...args) => {
    logged.push(args);
  });

  const app = express();
  app.get("/api/v1/boom", () => {
    throw err;
  });
  app.use(globalErrorHandler);

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/boom`);
    return { status: response.status, body: await response.json(), logged };
  } finally {
    server.close();
  }
};

/**
 * Counts how many requests a limiter lets through versus rejects.
 *
 * The limiter runs inside a real Express app over real HTTP requests rather than
 * being invoked with a synthetic req object: express-rate-limit v8 resolves
 * asynchronously and inspects `req.app` for its `trust proxy` validation, so a
 * hand-rolled request object throws inside an unhandled rejection and reports a
 * limiter that looks open when it is not. Mounting it also exercises the same
 * wiring the application uses.
 */
const probeLimiter = async (limiter, requestCount) => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(limiter);
  app.get("/x", (_req, res) => res.status(200).json({ ok: true }));

  // The limiter's handler forwards an AppError to next(); an error handler turns
  // that into the 429 response and keeps the expected rejection out of the test
  // output.
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ message: err.message });
  });

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  let allowed = 0;
  let blocked = 0;
  try {
    for (let i = 0; i < requestCount; i++) {
      const response = await fetch(`http://127.0.0.1:${port}/x`);
      await response.arrayBuffer();
      if (response.status === 429) blocked += 1;
      else allowed += 1;
    }
  } finally {
    server.close();
  }

  return { allowed, blocked };
};

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

test("P1-8 isDevelopment and isProduction match only exact values", (t) => {
  withNodeEnv(t, "development");
  assert.equal(isDevelopment(), true);
  assert.equal(isProduction(), false);

  withNodeEnv(t, "production");
  assert.equal(isDevelopment(), false);
  assert.equal(isProduction(), true);
});

test("P1-8 near-miss NODE_ENV values enable neither posture", (t) => {
  // Case variants and abbreviations must not be treated as either exact value;
  // that ambiguity is what previously slipped through the open gates. Only
  // "prod" (the documented abbreviation) maps to the production posture, and
  // only "dev" maps to development. Everything else hardens by default.
  for (const value of ["Production", "PRODUCTION", "prod_typo", "develop", "dev"]) {
    withNodeEnv(t, value);
    assert.equal(isDevelopment(), false, `"${value}" must not be development`);
    assert.equal(isProduction(), false, `"${value}" must not be production`);
  }
});

test("P1-8 surrounding whitespace is tolerated so a padded env var still works", (t) => {
  // A trailing newline or space is a plausible accident in a secret store, and
  // rejecting the boot over it would push operators toward disabling the check.
  // Casing is still not coerced: that would hide a real misconfiguration.
  withNodeEnv(t, "  production \n");
  assert.equal(isProduction(), true);
  assert.equal(isDevelopment(), false);
});

test("P1-8 validateNodeEnv rejects a missing NODE_ENV", () => {
  const previous = process.env.NODE_ENV;
  delete process.env.NODE_ENV;
  try {
    assert.throws(() => validateNodeEnv(), /NODE_ENV is required/);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("P1-8 validateNodeEnv rejects unrecognised NODE_ENV values", () => {
  const previous = process.env.NODE_ENV;
  try {
    // "prod" is included because it is the most common real-world typo: it
    // would otherwise have produced a limiter-free, stack-trace-leaking
    // deployment that still looked like production to the operator.
    for (const value of ["prod", "prod_typo", "Production", "PRODUCTION", "dev"]) {
      process.env.NODE_ENV = value;
      assert.throws(
        () => validateNodeEnv(),
        /not recognised|is required/,
        `expected "${value}" to be rejected`,
      );
    }
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("P1-8 validateNodeEnv accepts every allowed value", () => {
  const previous = process.env.NODE_ENV;
  try {
    for (const value of ALLOWED_NODE_ENVS) {
      process.env.NODE_ENV = value;
      assert.equal(validateNodeEnv(), value);
    }
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("P1-8 getNodeEnv trims whitespace and reports unset as empty", () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "  staging  ";
    assert.equal(getNodeEnv(), "staging");
    delete process.env.NODE_ENV;
    assert.equal(getNodeEnv(), "");
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

// ---------------------------------------------------------------------------
// errorMiddleware: stack traces fail closed
// ---------------------------------------------------------------------------

test("P1-8 errorMiddleware hides stack traces in production", async (t) => {
  const { status, body, logged } = await renderError(
    t,
    "production",
    new Error("connect ECONNREFUSED 10.0.0.5:27017 with secret=db-password-123"),
  );

  assert.equal(status, 500);
  assert.equal(body.message, "Something went very wrong!");
  assert.equal(body.stack, undefined);
  assert.doesNotMatch(JSON.stringify(body), /db-password-123|ECONNREFUSED|at /);
  // Suppressed from the client, retained in the server log. Asserted against
  // the Error object itself because `message`/`stack` are non-enumerable and
  // vanish through JSON.stringify.
  assert.ok(logged.length > 0, "the internal error must still be logged");
  assert.ok(
    logged[0].some((arg) => arg instanceof Error && /ECONNREFUSED/.test(arg.message)),
    `the original error should reach the server log, received: ${logged[0]}`,
  );
});

test("P1-8 errorMiddleware hides stack traces in staging", async (t) => {
  const { body } = await renderError(
    t,
    "staging",
    new Error("internal path leak /srv/app/services/paymentService.js"),
  );

  assert.equal(body.stack, undefined);
  assert.doesNotMatch(JSON.stringify(body), /paymentService\.js|\/srv\/app/);
});

test("P1-8 errorMiddleware hides stack traces for a typo like prod_typo", async (t) => {
  // This is the exact regression: `=== "production"` sent the developer payload
  // to clients whenever NODE_ENV was anything else.
  const { body } = await renderError(
    t,
    "prod_typo",
    new Error("leaky internal detail from a mistyped environment"),
  );

  assert.equal(body.stack, undefined);
  assert.equal(body.message, "Something went very wrong!");
  assert.doesNotMatch(JSON.stringify(body), /leaky internal detail/);
});

test("P1-8 errorMiddleware hides stack traces when NODE_ENV is unset", async (t) => {
  const { body } = await renderError(t, undefined, new Error("unset environment leak"));

  assert.equal(body.stack, undefined);
  assert.doesNotMatch(JSON.stringify(body), /unset environment leak/);
});

test("P1-8 errorMiddleware hides stack traces in test mode", async (t) => {
  const { body } = await renderError(t, "test", new Error("test-mode internal detail"));

  assert.equal(body.stack, undefined);
});

test("P1-8 errorMiddleware still shows stack traces in development", async (t) => {
  const { body } = await renderError(t, "development", new Error("debug me"));

  assert.ok(body.stack, "development must keep the detailed payload");
  assert.equal(body.message, "debug me");
});

test("P1-8 operational errors keep their message in every hardened mode", async (t) => {
  const operational = new AppError("Please provide email and password!", 400);

  for (const env of ["production", "staging", "prod_typo", undefined, "test"]) {
    const { status, body } = await renderError(t, env, operational);
    assert.equal(status, 400, `status for ${env}`);
    assert.equal(body.message, "Please provide email and password!", `message for ${env}`);
    assert.equal(body.stack, undefined, `stack must be hidden for ${env}`);
  }
});

// ---------------------------------------------------------------------------
// rateLimitMiddleware: limiters fail closed
// ---------------------------------------------------------------------------

test("P1-8 rate limiters stay active in production", async (t) => {
  withNodeEnv(t, "production");

  const api = await probeLimiter(apiLimiter, 120);
  assert.ok(api.blocked > 0, "apiLimiter must reject requests in production");
  assert.equal(api.allowed, 100);

  const auth = await probeLimiter(authLimiter, 15);
  assert.ok(auth.blocked > 0, "authLimiter must reject requests in production");
  assert.equal(auth.allowed, 10);
});

test("P1-8 rate limiters stay active in staging", async (t) => {
  withNodeEnv(t, "staging");
  assert.ok((await probeLimiter(authLimiter, 15)).blocked > 0);
});

test("P1-8 rate limiters stay active for a typo like prod_typo", async (t) => {
  // Previously `skip` only matched "development", but NODE_ENV was never
  // validated, so an operator typo silently produced a limiter-free deployment.
  // The value is now rejected at boot AND treated as hardened if it slips past.
  withNodeEnv(t, "prod_typo");

  assert.throws(() => validateNodeEnv(), /not recognised/);
  assert.ok((await probeLimiter(authLimiter, 15)).blocked > 0);
});

test("P1-8 rate limiters stay active when NODE_ENV is unset", async (t) => {
  withNodeEnv(t, undefined);
  assert.ok((await probeLimiter(authLimiter, 15)).blocked > 0);
});

test("P1-8 rate limiters stay active in test mode", async (t) => {
  withNodeEnv(t, "test");
  assert.ok((await probeLimiter(apiLimiter, 120)).blocked > 0);
});

test("P1-8 rate limiters are skipped only in development", async (t) => {
  withNodeEnv(t, "development");

  const api = await probeLimiter(apiLimiter, 150);
  assert.equal(api.blocked, 0, "apiLimiter must be open in development");
  assert.equal(api.allowed, 150);

  const auth = await probeLimiter(authLimiter, 40);
  assert.equal(auth.blocked, 0, "authLimiter must be open in development");
  assert.equal(auth.allowed, 40);
});
