import assert from "node:assert/strict";
import { test } from "node:test";
import { Writable } from "node:stream";
import http from "node:http";
import express from "express";
import pinoHttp from "pino-http";
import { logger, REDACT_CENSOR, REDACT_PATHS } from "../utils/logger.js";
import { httpLogger } from "../middlewares/logger.middleware.js";

const JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.live.jwt.token";
const COOKIE_JWT = "test.cookie.token";
const X_ACCESS_TOKEN = "x-access-token-secret-value";
const SET_COOKIE_VALUE = "jwt=set.cookie.value; HttpOnly";

/**
 * Drives a real HTTP request through the real middleware and returns everything
 * the log stream emitted. Asserting on the serialized output is the only way to
 * catch a leak here: the bug is that a value reaches the sink at all, which no
 * unit-level mock of the serializer would reveal.
 */
const captureLogs = async (app, { headers = {}, path = "/api/v1/test" } = {}) =>
  new Promise((resolve, reject) => {
    const lines = [];
    const stream = new Writable({
      write(chunk, _encoding, done) {
        for (const line of chunk.toString().split("\n")) {
          if (line.trim()) lines.push(line);
        }
        done();
      },
    });

    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      const req = http.request(
        { host: "127.0.0.1", port, path, method: "GET", headers },
        (res) => {
          res.resume();
          res.on("end", () => {
            server.close(() =>
              resolve({ lines, output: lines.join("\n") }),
            );
          });
        },
      );
      req.on("error", (err) => {
        server.close(() => reject(err));
      });
      req.end();
    });
  });

const buildApp = (middleware) => {
  const app = express();
  app.use(middleware);
  app.get("/api/v1/test", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
};

/**
 * Builds the HTTP logger exactly as the application does, but against a
 * capturing stream. Overriding process.stdout is not viable: the test runner
 * reports results through the same stream, so a capture there races with the
 * reporter and silently drops output.
 */
const withHttpLogger = async (fn) => {
  const { default: pino } = await import("pino");
  const { requestSerializer, responseSerializer } = await import(
    "../middlewares/logger.middleware.js"
  );

  const lines = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(chunk.toString());
      done();
    },
  });

  // The shared logger's redact config is the production backstop; reproduce it
  // here so the test exercises both layers together.
  const captureLogger = pino(
    { redact: { paths: REDACT_PATHS, censor: REDACT_CENSOR, remove: false } },
    stream,
  );

  const middleware = pinoHttp({
    logger: captureLogger,
    genReqId: (req) => req.headers["x-request-id"] || "generated-id",
    serializers: { req: requestSerializer, res: responseSerializer },
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.originalUrl?.split("?")[0] ?? req.url} completed with ${res.statusCode}`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.originalUrl?.split("?")[0] ?? req.url} failed with ${res.statusCode}: ${err.message}`,
  });

  const output = await fn(buildApp(middleware));
  return { output: `${output}\n${lines.join("\n")}` };
};

const withTempLogger = async (options, fn) => {
  const { default: pino } = await import("pino");
  const lines = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(chunk.toString());
      done();
    },
  });
  const tempLogger = pino({ ...options }, stream);
  await fn(tempLogger);
  return { lines, output: lines.join("") };
};

test("HTTP request logging does not leak the Authorization or Cookie headers", async () => {
  // A serializer that includes headers, i.e. the configuration that shipped
  // with the defect, with the redact config as the only remaining defence.
  const { output } = await withTempLogger(
    { redact: { paths: REDACT_PATHS, censor: REDACT_CENSOR, remove: false } },
    async (tempLogger) => {
      const app = buildApp(
        pinoHttp({
          logger: tempLogger,
          serializers: {
            req: (req) => ({
              id: req.id,
              method: req.method,
              url: req.url,
              headers: req.headers,
            }),
            res: (res) => ({
              statusCode: res.statusCode,
              headers: res.headers,
            }),
          },
        }),
      );

      await captureLogs(app, {
        headers: {
          Authorization: `Bearer ${JWT}`,
          Cookie: `jwt=${COOKIE_JWT}`,
          "x-access-token": X_ACCESS_TOKEN,
        },
      });
    },
  );

  assert.equal(
    output.includes(JWT),
    false,
    "the bearer token must not appear in the log output",
  );
  assert.equal(
    output.includes(COOKIE_JWT),
    false,
    "the cookie token must not appear in the log output",
  );
  assert.equal(
    output.includes(X_ACCESS_TOKEN),
    false,
    "the x-access-token header must not appear in the log output",
  );
  assert.ok(
    output.includes(REDACT_CENSOR),
    `redact must still be the backstop: ${output}`,
  );
});

test("the production request serializer emits no credentials for a real request", async () => {
  // Uses the serializers the application actually installs, through a real
  // HTTP request.
  const { output } = await withHttpLogger((app) =>
    captureLogs(app, {
      headers: {
        Authorization: `Bearer ${JWT}`,
        Cookie: `jwt=${COOKIE_JWT}`,
        "x-access-token": X_ACCESS_TOKEN,
      },
    }),
  );

  for (const secret of [JWT, COOKIE_JWT, X_ACCESS_TOKEN, "Bearer"]) {
    assert.equal(
      output.includes(secret),
      false,
      `"${secret}" must not reach the log output`,
    );
  }

  assert.ok(
    output.includes(REDACT_CENSOR) || output.includes("hasAuthorization"),
    "either the serializer allowlist or the redact backstop must be visible",
  );
});

test("the request serializer exposes only safe operational metadata", async () => {
  // Drives the installed serializers with a credentialed request that also
  // carries a token in the query string.
  const { output } = await withHttpLogger((app) =>
    captureLogs(app, {
      headers: {
        Authorization: `Bearer ${JWT}`,
        Cookie: `jwt=${COOKIE_JWT}`,
        "user-agent": "jest-agent",
        "x-request-id": "req-123",
      },
      path: "/api/v1/payments?jwt=leaky",
    }),
  );

  assert.equal(
    output.includes("leaky"),
    false,
    "query-string tokens must not be logged",
  );
  assert.equal(output.includes(JWT), false);
  assert.equal(output.includes(COOKIE_JWT), false);
  assert.equal(output.includes("Bearer"), false);

  // Operational metadata must survive so the logs stay useful for debugging.
  assert.ok(
    output.includes("/api/v1/payments"),
    "the request path should still be logged",
  );
  assert.ok(output.includes("req-123"), "the request id should be logged");
  assert.ok(output.includes("jest-agent"), "the user agent should be logged");
  assert.ok(
    output.includes('"hasAuthorization":true'),
    "session state should stay visible without the credential",
  );
});

test("the redact config covers every credential header path", async () => {
  
  for (const path of [
    "req.headers.authorization",
    "req.headers.cookie",
    'req.headers["x-access-token"]',
    'req.headers["set-cookie"]',
    'res.headers["set-cookie"]',
  ]) {
    assert.ok(
      REDACT_PATHS.includes(path),
      `redact paths must include ${path}`,
    );
  }
});

test("the shared logger's redact config is actually applied", async () => {
  // Proves the exported REDACT_PATHS are effective by applying them to a logger
  // built the same way. `logger` itself writes to stdout, which is shared with
  // the test reporter, so it is not used as the capture target here.
  const { output } = await withTempLogger(
    { redact: { paths: REDACT_PATHS, censor: REDACT_CENSOR, remove: false } },
    async (tempLogger) => {
      tempLogger.info(
        {
          req: {
            method: "GET",
            headers: {
              authorization: `Bearer ${JWT}`,
              cookie: `jwt=${COOKIE_JWT}`,
              "x-access-token": X_ACCESS_TOKEN,
            },
          },
        },
        "shared logger probe",
      );
    },
  );

  assert.equal(output.includes(JWT), false, "bearer token must be redacted");
  assert.equal(output.includes(COOKIE_JWT), false, "cookie must be redacted");
  assert.equal(output.includes(X_ACCESS_TOKEN), false);
  assert.ok(
    output.includes(REDACT_CENSOR),
    `expected ${REDACT_CENSOR} in output: ${output}`,
  );
});

test("redaction replaces credential values with the censor marker", async () => {
    const { default: pino } = await import("pino");

  const lines = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(chunk.toString());
      done();
    },
  });
  const tempLogger = pino(
    { redact: { paths: REDACT_PATHS, censor: REDACT_CENSOR, remove: false } },
    stream,
  );

  tempLogger.info(
    {
      req: {
        method: "GET",
        headers: {
          authorization: `Bearer ${JWT}`,
          cookie: `jwt=${COOKIE_JWT}`,
          "x-access-token": X_ACCESS_TOKEN,
        },
      },
    },
    "request received",
  );

  const output = lines.join("\n");
  assert.equal(output.includes(JWT), false, "bearer token must be redacted");
  assert.equal(output.includes(COOKIE_JWT), false, "cookie must be redacted");
  assert.equal(
    output.includes(X_ACCESS_TOKEN),
    false,
    "x-access-token must be redacted",
  );
  assert.ok(
    output.includes(REDACT_CENSOR),
    `expected ${REDACT_CENSOR} in output: ${output}`,
  );
});

test("response Set-Cookie headers are redacted too", async () => {
    const { default: pino } = await import("pino");

  const lines = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(chunk.toString());
      done();
    },
  });
  const tempLogger = pino(
    { redact: { paths: REDACT_PATHS, censor: REDACT_CENSOR, remove: false } },
    stream,
  );

  tempLogger.info(
    { res: { headers: { "set-cookie": SET_COOKIE_VALUE } } },
    "response sent",
  );

  const output = lines.join("\n");
  assert.equal(output.includes("set.cookie.value"), false);
  assert.ok(output.includes(REDACT_CENSOR));
});

test("password and token fields are redacted from log payloads", async () => {
    const { default: pino } = await import("pino");

  const lines = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(chunk.toString());
      done();
    },
  });
  const tempLogger = pino(
    { redact: { paths: REDACT_PATHS, censor: REDACT_CENSOR, remove: false } },
    stream,
  );

  tempLogger.info(
    { body: { password: "hunter2", token: "tok-secret", keep: "visible" } },
    "payload",
  );

  const output = lines.join("\n");
  assert.equal(output.includes("hunter2"), false, "password must be redacted");
  assert.equal(output.includes("tok-secret"), false, "token must be redacted");
  assert.ok(
    output.includes("visible"),
    "non-sensitive fields must survive redaction",
  );
});

test("the development morgan format logs no query string", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(
    new URL("../app.js", import.meta.url),
    "utf8",
  );

  assert.equal(
    source.includes('morgan("dev")'),
    false,
    'the stock "dev" format must not be used, it logs the full url',
  );
  assert.ok(
    source.includes("safe-url"),
    "a query-string-free format must be configured instead",
  );
});


