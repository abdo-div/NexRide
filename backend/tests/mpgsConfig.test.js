import test from "node:test";
import assert from "node:assert/strict";
import { createMpgsConfig } from "../payments/providers/mpgs/mpgs.config.js";
import { MpgsError } from "../payments/providers/mpgs/mpgs.errors.js";

const validEnv = Object.freeze({
  MPGS_BASE_URL: "https://example.gateway.mastercard.com/",
  MPGS_MERCHANT_ID: "TESTMERCHANT",
  MPGS_API_PASSWORD: "secret",
  MPGS_API_VERSION: "100",
  MPGS_CURRENCY: "lyd",
});

test("creates normalized, immutable MPGS configuration", () => {
  const config = createMpgsConfig(validEnv);

  assert.equal(
    config.baseUrl,
    "https://example.gateway.mastercard.com",
  );
  assert.equal(config.merchantId, "TESTMERCHANT");
  assert.equal(config.apiVersion, "100");
  assert.equal(config.currency, "LYD");
  assert.equal(Object.isFrozen(config), true);
});

test("reports the environment variable names for missing configuration", () => {
  assert.throws(
    () => createMpgsConfig({}),
    (error) => {
      assert.match(error.message, /MPGS_BASE_URL/);
      assert.match(error.message, /MPGS_MERCHANT_ID/);
      assert.match(error.message, /MPGS_API_PASSWORD/);
      assert.match(error.message, /MPGS_API_VERSION/);
      assert.match(error.message, /MPGS_CURRENCY/);
      return true;
    },
  );
});

test("requires an HTTPS gateway URL", () => {
  assert.throws(
    () =>
      createMpgsConfig({
        ...validEnv,
        MPGS_BASE_URL: "http://example.com",
      }),
    /must use HTTPS/,
  );
});

test("rejects credentials embedded in the gateway URL", () => {
  assert.throws(
    () =>
      createMpgsConfig({
        ...validEnv,
        MPGS_BASE_URL: "https://user:password@example.com",
      }),
    /must not contain credentials/,
  );
});

test("requires a positive integer API version", () => {
  for (const apiVersion of ["latest", "1.5", "0", "-1"]) {
    assert.throws(
      () =>
        createMpgsConfig({
          ...validEnv,
          MPGS_API_VERSION: apiVersion,
        }),
      /positive integer/,
    );
  }
});

test("requires a three-letter currency code", () => {
  assert.throws(
    () =>
      createMpgsConfig({
        ...validEnv,
        MPGS_CURRENCY: "DINAR",
      }),
    /three-letter currency code/,
  );
});

test("MpgsError preserves normalized gateway metadata", () => {
  const cause = new Error("socket closed");
  const error = new MpgsError("MPGS request failed", {
    cause,
    httpStatus: 503,
    gatewayCode: "SYSTEM_ERROR",
    retryable: true,
  });

  assert.equal(error.name, "MpgsError");
  assert.equal(error.cause, cause);
  assert.equal(error.httpStatus, 503);
  assert.equal(error.gatewayCode, "SYSTEM_ERROR");
  assert.equal(error.retryable, true);
});
