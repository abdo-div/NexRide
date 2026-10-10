import assert from "node:assert/strict";
import { test } from "node:test";
import { swaggerSpec } from "../config/swagger.js";

/**
 * Swagger/OpenAPI generation checks.
 *
 * These assertions only exercise the document generator: the module reads the
 * route files as text, so no database, Redis, Moamalat credentials or
 * production secrets are required.
 */

const paths = swaggerSpec.paths ?? {};

test("swagger document is generated with OpenAPI metadata", () => {
  assert.equal(swaggerSpec.openapi, "3.0.0");
  assert.equal(swaggerSpec.info.title, "NexRide API Specification");
  assert.ok(swaggerSpec.info.version);
});

test("route discovery finds a non-zero number of paths", () => {
  const count = Object.keys(paths).length;
  assert.ok(count > 0, "expected the generated document to contain paths");
  assert.ok(count >= 20, `expected many documented paths, got ${count}`);
});

test("documented paths never contain the glob source directory", () => {
  for (const routePath of Object.keys(paths)) {
    assert.ok(
      !routePath.includes("*"),
      `unresolved glob leaked into paths: ${routePath}`,
    );
  }
});

test("major route groups are present", () => {
  const expectedGroups = [
    "/users/login",
    "/users/signup",
    "/cars",
    "/cars/{id}",
    "/bookings",
    "/companies",
    "/payments",
    "/payments/moamalat/config",
    "/admin/settings",
    "/admin/reports/summary",
  ];

  for (const group of expectedGroups) {
    assert.ok(
      Object.hasOwn(paths, group),
      `expected documented path ${group}; got ${Object.keys(paths).join(", ")}`,
    );
  }
});

test("public auth and Moamalat config are documented as unauthenticated", () => {
  assert.deepEqual(paths["/users/login"].post.security, []);
  assert.deepEqual(paths["/payments/moamalat/config"].get.security, []);
});

test("JWT bearer security scheme is preserved", () => {
  assert.deepEqual(swaggerSpec.components.securitySchemes.bearerAuth, {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });
  assert.deepEqual(swaggerSpec.security, [{ bearerAuth: [] }]);
});

test("server URL uses the configured port and the /api/v1 prefix", () => {
  assert.equal(Array.isArray(swaggerSpec.servers), true);
  const [server] = swaggerSpec.servers;
  assert.ok(server.url, "expected a server url");
  assert.ok(
    server.url.endsWith("/api/v1"),
    `expected the /api/v1 prefix, got ${server.url}`,
  );

  const configuredPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  assert.equal(
    server.url,
    `http://localhost:${configuredPort}/api/v1`,
    "server url must follow the configured PORT",
  );
  assert.ok(
    !server.url.includes(":5000"),
    "the default 5000 port must not be used",
  );
});

test("documented paths do not duplicate the API prefix", () => {
  for (const routePath of Object.keys(paths)) {
    assert.ok(
      !routePath.startsWith("/api/v1"),
      `path must not repeat the /api/v1 prefix: ${routePath}`,
    );
  }
});

test("route discovery works from any working directory", async () => {
  const originalCwd = process.cwd();
  try {
    process.chdir(process.env.TEMP ?? originalCwd);
    const fresh = await import(
      `../config/swagger.js?cwd=${encodeURIComponent(originalCwd)}`
    );
    assert.ok(
      Object.keys(fresh.swaggerSpec.paths ?? {}).length > 0,
      "path discovery must not depend on the process working directory",
    );
  } finally {
    process.chdir(originalCwd);
  }
});
