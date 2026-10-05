import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:http";

process.env.FRONTEND_DOMAIN =
  "http://localhost:5174,https://partners.example.test";
const { securityCors } = await import("../middlewares/security.middleware.js");

let server;
let serverUrl;

before(async () => {
  server = createServer((req, res) => {
    securityCors(req, res, () => {
      res.statusCode = 200;
      res.end("ok");
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  serverUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

const get = (origin) =>
  fetch(serverUrl, {
    headers: origin ? { Origin: origin } : {},
  });

test("allows the active local frontend origin with credentials", async () => {
  const response = await get("http://localhost:5174");

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "http://localhost:5174",
  );
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});

test("allows multiple configured origins", async () => {
  const response = await get("https://partners.example.test");

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "https://partners.example.test",
  );
});

test("does not grant CORS access to an unconfigured origin", async () => {
  const response = await get("https://unconfigured.example.test");

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("rejects an origin that only suffix-matches an allowed origin", async () => {
  const response = await get("http://evil-localhost:5174");

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("allows server-to-server requests without an Origin header", async () => {
  const response = await get();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});
