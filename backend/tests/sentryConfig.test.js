import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

/**
 * Regression coverage for the removal of the unused Sentry configuration.
 *
 * `config/sentry.js` used to import `@sentry/node` and export `initSentry` /
 * `sentryErrorHandler`, but no caller ever invoked it, `@sentry/node` was never
 * declared in package.json, and importing the module failed with
 * ERR_MODULE_NOT_FOUND. It captured no errors and only implied that monitoring
 * existed, so it was deleted instead of wired up.
 *
 * These cases lock in that decision: no un-importable half-integration, no
 * undocumented DSN variable, and an API that still loads with no monitoring
 * service configured.
 */

const backendRoot = process.cwd();
// `tests` is excluded: this guard asserts on string literals it defines itself.
const skipDirectories = new Set(["node_modules", ".git", "dist", "coverage", "tests"]);

const collectSourceFiles = (directory) => {
  const found = [];
  for (const entry of readdirSync(directory)) {
    if (skipDirectories.has(entry)) continue;
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      found.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (/\.(js|mjs|cjs)$/.test(entry)) found.push(fullPath);
  }
  return found;
};

const sourceFiles = collectSourceFiles(backendRoot);
const relative = (file) => file.slice(backendRoot.length + 1);

test("the un-importable Sentry config module is gone", () => {
  const sentryConfig = join(backendRoot, "config", "sentry.js");

  assert.throws(
    () => statSync(sentryConfig),
    /ENOENT/,
    "config/sentry.js must not return without a real, installed integration",
  );
});

test("no backend source file references Sentry", () => {
  const offenders = sourceFiles
    .filter((file) => /@sentry\//i.test(readFileSync(file, "utf8")))
    .map(relative);

  assert.deepEqual(offenders, []);
});

test("SENTRY_DSN is not read anywhere in the backend", () => {
  const offenders = sourceFiles
    .filter((file) => /SENTRY_DSN/.test(readFileSync(file, "utf8")))
    .map(relative);

  assert.deepEqual(offenders, []);
});

test("no Sentry dependency is declared in package.json", () => {
  const manifest = JSON.parse(readFileSync(join(backendRoot, "package.json"), "utf8"));
  const declared = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
    ...manifest.optionalDependencies,
  };
  const offenders = Object.keys(declared).filter((name) =>
    name.toLowerCase().includes("sentry"),
  );

  assert.deepEqual(offenders, []);
});

test("the example environment file documents no Sentry variable", () => {
  const example = readFileSync(join(backendRoot, ".env.example"), "utf8");

  assert.doesNotMatch(example, /SENTRY_DSN/);
  assert.doesNotMatch(example, /@sentry\//i);
});

test("the API app still loads with no monitoring service configured", async () => {
  const previousDsn = process.env.SENTRY_DSN;
  delete process.env.SENTRY_DSN;

  try {
    const { default: app } = await import("../app.js");

    assert.equal(typeof app, "function");
    assert.equal(typeof app.use, "function");
  } finally {
    if (previousDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = previousDsn;
  }
});
