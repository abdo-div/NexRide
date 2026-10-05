import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveRedisConnection } from "../config/redisConnection.js";

test("redis:// URLs do not enable TLS", () => {
  const config = resolveRedisConnection({ REDIS_URL: "redis://localhost:6379" });

  assert.equal(config.connection, "redis://localhost:6379");
  assert.equal(Object.hasOwn(config.options, "tls"), false);
});

test("rediss:// URLs enable TLS with certificate verification", () => {
  const config = resolveRedisConnection({
    REDIS_URL: "rediss://cache.example.test:6380",
  });

  assert.deepEqual(config.options.tls, { rejectUnauthorized: true });
});

test("host and port configuration remains non-TLS", () => {
  const config = resolveRedisConnection({
    REDIS_HOST: "redis.internal",
    REDIS_PORT: "6380",
    REDIS_PASSWORD: "test-only-password",
  });

  assert.deepEqual(config.connection, {
    host: "redis.internal",
    port: 6380,
    password: "test-only-password",
  });
  assert.equal(Object.hasOwn(config.options, "tls"), false);
});

test("supported Redis URL aliases also infer TLS from rediss://", () => {
  const config = resolveRedisConnection({
    UPSTASH_REDIS_URL: "rediss://cache.example.test:6380",
  });

  assert.equal(config.connection, "rediss://cache.example.test:6380");
  assert.equal(config.options.tls.rejectUnauthorized, true);
});