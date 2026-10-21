import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import express from "express";
import { httpLogger, requestIdFor } from "../middlewares/logger.middleware.js";
import { securityCors } from "../middlewares/security.middleware.js";

const request = (app, headers = {}) =>
  new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      const outgoing = http.request(
        { host: "127.0.0.1", port, path: "/probe", headers },
        (response) => {
          response.resume();
          response.on("end", () => {
            server.close(() => resolve(response));
          });
        },
      );
      outgoing.on("error", (error) => server.close(() => reject(error)));
      outgoing.end();
    });
  });

const buildApp = () => {
  const app = express();
  app.use(httpLogger);
  app.use(securityCors);
  app.get("/probe", (req, res) => res.json({ requestId: req.id }));
  return app;
};

test("a valid upstream request ID is logged and returned to the caller", async () => {
  const response = await request(buildApp(), {
    origin: "http://localhost:5173",
    "x-request-id": "edge:req-123",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["x-request-id"], "edge:req-123");
  assert.match(response.headers["access-control-expose-headers"], /X-Request-Id/i);
});

test("missing request IDs are generated and returned as UUIDs", async () => {
  const response = await request(buildApp());

  assert.match(
    response.headers["x-request-id"],
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});

test("unsafe or oversized request IDs are replaced before reaching logs", () => {
  for (const supplied of ["contains spaces", "line\nbreak", "x".repeat(129), ["one", "two"]]) {
    const headers = {};
    const generated = requestIdFor(
      { headers: { "x-request-id": supplied } },
      { setHeader: (name, value) => (headers[name] = value) },
    );

    assert.notEqual(generated, supplied);
    assert.match(generated, /^[0-9a-f-]{36}$/i);
    assert.equal(headers["X-Request-Id"], generated);
  }
});
