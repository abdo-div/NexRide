import Redis from "ioredis";
import logger from "../utils/logger.js";

// ─── Main App Redis Client ────────────────────────────────────────────────────
// Used for: cache, idempotency, tenant resolution, redlock
// NOTE: BullMQ cannot use a client with ioredis keyPrefix — use bullmqConnection below
const appRedisOptions = {
  keyPrefix: "nexride:",
  tls: {
    rejectUnauthorized: false,
  },
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
};

const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, appRedisOptions)
  : new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      ...appRedisOptions,
    });

redisClient.on("connect", () => {
  logger.redis("App client connected (Namespaced: nexride:*)");
});

redisClient.on("error", (err) => {
  logger.error(`Redis App Client Error: ${err.message}`);
});

// ─── BullMQ Redis Connection ──────────────────────────────────────────────────
// BullMQ requires a plain ioredis connection WITHOUT keyPrefix.
// It manages its own key namespacing internally via the `prefix` option on Queue/Worker.
const bullmqRedisOptions = {
  maxRetriesPerRequest: null, // BullMQ requires null (it manages its own retry logic)
  tls: {
    rejectUnauthorized: false,
  },
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
};

const bullmqConnection = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, bullmqRedisOptions)
  : new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      ...bullmqRedisOptions,
    });

bullmqConnection.on("connect", () => {
  logger.redis("BullMQ client connected");
});

bullmqConnection.on("error", (err) => {
  logger.error(`Redis BullMQ Client Error: ${err.message}`);
});

export { redisClient, bullmqConnection };
export default redisClient;

