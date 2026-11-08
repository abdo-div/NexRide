import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  createMpgsConfig,
  MpgsClient,
  MpgsProvider,
  PaymentProvider,
} from "../payments/index.js";
import { validateOptionalMpgs } from "../config/productionEnv.js";

const paymentsRoot = path.resolve("payments");

const javascriptFiles = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory()
      ? javascriptFiles(target)
      : entry.name.endsWith(".js") ? [target] : [];
  });

test("the copied payments folder exports the complete MPGS API", () => {
  assert.equal(typeof PaymentProvider, "function");
  assert.equal(typeof createMpgsConfig, "function");
  assert.equal(typeof MpgsClient, "function");
  assert.equal(typeof MpgsProvider, "function");
});

test("portable source has no NexRide, Express, Mongoose, or application imports", () => {
  for (const file of javascriptFiles(paymentsRoot)) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /from\s+["'](?:\.\.\/)+(?:models|services|controllers|routes|config)\//);
    assert.doesNotMatch(source, /from\s+["'](?:express|mongoose)["']/);
    assert.doesNotMatch(source, /NexRideMpgsService|BookingModel|PaymentModel/);
  }
});

test("production MPGS validation is optional but fails closed when partially enabled", () => {
  const omitted = [];
  validateOptionalMpgs({}, omitted);
  assert.deepEqual(omitted, []);

  const partial = [];
  validateOptionalMpgs({ MPGS_BASE_URL: "https://gateway.example" }, partial);
  assert.ok(partial.some((problem) => problem.includes("MPGS_MERCHANT_ID")));
  assert.ok(partial.some((problem) => problem.includes("MPGS_API_PASSWORD")));
});

test("production validation refuses test merchants", () => {
  const problems = [];
  validateOptionalMpgs({
    MPGS_BASE_URL: "https://gateway.example",
    MPGS_MERCHANT_ID: "TESTMERCHANT",
    MPGS_API_PASSWORD: "real-looking-secret-value",
    MPGS_API_VERSION: "100",
    MPGS_CURRENCY: "LYD",
    MPGS_OPERATION: "PURCHASE",
  }, problems);
  assert.ok(problems.some((problem) => problem.includes("must not be a test merchant")));
});
