import assert from "node:assert/strict";
import { test } from "node:test";
import { securityHeaders } from "../middlewares/security.middleware.js";

test("production security headers allow only the resources required by Mapbox GL", () => {
  const headers = new Map();
  const response = {
    setHeader(name, value) {
      headers.set(name.toLowerCase(), String(value));
    },
    getHeader(name) {
      return headers.get(name.toLowerCase());
    },
    removeHeader(name) {
      headers.delete(name.toLowerCase());
    },
  };
  let continued = false;

  securityHeaders({ headers: {} }, response, () => {
    continued = true;
  });

  const policy = headers.get("content-security-policy") ?? "";
  assert.equal(continued, true);
  assert.match(policy, /connect-src 'self' https:\/\/api\.mapbox\.com https:\/\/events\.mapbox\.com/);
  assert.match(policy, /img-src 'self' data: blob:/);
  assert.match(policy, /worker-src 'self' blob:/);
  assert.match(policy, /script-src 'self' 'wasm-unsafe-eval'/);
  assert.match(policy, /default-src 'self'/);
  assert.doesNotMatch(policy, /script-src[^;]*'unsafe-inline'/);
});
