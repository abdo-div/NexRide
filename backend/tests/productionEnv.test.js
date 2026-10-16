import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import { validateProductionEnv } from "../config/productionEnv.js";

const validEnvironment = (overrides = {}) => ({
  NODE_ENV: "production",
  PORT: "3000",
  JWT_SECRET: "a-production-only-jwt-secret-with-more-than-32-bytes",
  JWT_EXPIRES_IN: "30d",
  JWT_COOKIE_EXPIRES_IN: "30",
  FRONTEND_URL: "https://nexride.ly",
  FRONTEND_DOMAIN: "https://nexride.ly",
  MONGODB_URI:
    "mongodb://nexride:strong-password@127.0.0.1:27017/nexride?replicaSet=rs0",
  REDIS_ENABLED: "true",
  REDIS_HOST: "127.0.0.1",
  EMAIL_QUEUE_ENABLED: "false",
  PRIVATE_STORAGE_DIR: path.resolve("production-private-test"),
  SMTP_HOST: "smtp.mail-provider.ly",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USERNAME: "nexride-smtp-user",
  SMTP_PASSWORD: "strong-smtp-password",
  EMAIL_FROM: "support@nexride.ly",
  MOAMALAT_ENV: "production",
  MOAMALAT_MID: "1234567890",
  MOAMALAT_TID: "1234567890",
  MOAMALAT_SECURE_KEY: "ab".repeat(32),
  ...overrides,
});

test("a complete production environment passes preflight", () => {
  assert.equal(validateProductionEnv(validEnvironment()), true);
});

test("preflight reports all missing production values in one error", () => {
  assert.throws(
    () => validateProductionEnv({ NODE_ENV: "production" }),
    (error) => {
      assert.match(error.message, /PORT must be/);
      assert.match(error.message, /MONGODB_URI is required/);
      assert.match(error.message, /SMTP_HOST is required/);
      assert.match(error.message, /MOAMALAT_MID is required/);
      return true;
    },
  );
});

test("production frontend origins must be exact HTTPS origins", () => {
  assert.throws(
    () =>
      validateProductionEnv(
        validEnvironment({
          FRONTEND_URL: "http://localhost:5173/reset",
          FRONTEND_DOMAIN: "https://nexride.ly",
        }),
      ),
    /FRONTEND_URL must be the public HTTPS origin only/,
  );

  assert.throws(
    () =>
      validateProductionEnv(
        validEnvironment({ FRONTEND_DOMAIN: "https://admin.nexride.ly" }),
      ),
    /must include the exact FRONTEND_URL origin/,
  );
});

test("MongoDB production configuration requires one transaction-capable URI", () => {
  assert.throws(
    () =>
      validateProductionEnv(
        validEnvironment({
          MONGODB_URI: "mongodb://127.0.0.1:27017/nexride",
        }),
      ),
    /must name replicaSet/,
  );

  assert.throws(
    () =>
      validateProductionEnv(
        validEnvironment({ MONGO_URI: "mongodb+srv://cluster.nexride.ly/nexride" }),
      ),
    /Configure only one MongoDB URI variable/,
  );
});

test("Redis and its dependent email queue must be configured consistently", () => {
  assert.throws(
    () =>
      validateProductionEnv(
        validEnvironment({ REDIS_ENABLED: "true", REDIS_HOST: "" }),
      ),
    /configure REDIS_URL or an explicit REDIS_HOST/i,
  );

  assert.throws(
    () =>
      validateProductionEnv(
        validEnvironment({
          REDIS_ENABLED: "false",
          REDIS_HOST: "",
          EMAIL_QUEUE_ENABLED: "true",
        }),
      ),
    /EMAIL_QUEUE_ENABLED cannot be true/,
  );
});

test("production SMTP and Moamalat formats fail closed", () => {
  assert.throws(
    () =>
      validateProductionEnv(
        validEnvironment({
          SMTP_PORT: "not-a-port",
          EMAIL_FROM: "not-an-email",
          MOAMALAT_ENV: "test",
          MOAMALAT_SECURE_KEY: "not-hex",
        }),
      ),
    (error) => {
      assert.match(error.message, /SMTP_PORT/);
      assert.match(error.message, /EMAIL_FROM/);
      assert.match(error.message, /MOAMALAT_ENV/);
      assert.match(error.message, /MOAMALAT_SECURE_KEY/);
      return true;
    },
  );
});

test("copied placeholder values are rejected before deployment", () => {
  assert.throws(
    () =>
      validateProductionEnv(
        validEnvironment({ JWT_SECRET: "replace-with-a-real-secret-value-now" }),
      ),
    /JWT_SECRET still contains a placeholder value/,
  );
});

test("Google OAuth credentials must be configured as a pair", () => {
  assert.throws(
    () =>
      validateProductionEnv(
        validEnvironment({ GOOGLE_CLIENT_ID: "client-id", GOOGLE_CLIENT_SECRET: "" }),
      ),
    /must either both be configured or both be omitted/,
  );
});
