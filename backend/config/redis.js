import Redis from "ioredis";
import logger from "../utils/logger.js";

const baseRedisOptions = {
  lazyConnect: true,
  enableOfflineQueue: true,
  connectTimeout: 1000,
  // BullMQ issues blocking commands (BRPOPLPUSH / XREAD BLOCK) that legitimately
  // take far longer than a round trip. A short commandTimeout here made every
  // blocking call fail and flooded the console with "Command timed out".
  commandTimeout: null,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    return times < 2 ? 100 : null;
  },
  tls: {
    rejectUnauthorized: false,
  },
};

/**
 * Hard ceiling for a Redis readiness probe so a slow or unreachable host can
 * never block application startup or an incoming request.
 */
const PROBE_TIMEOUT_MS = Number(process.env.REDIS_PROBE_TIMEOUT_MS) || 1500;

const resolveRedisUrl = () => {
  const hostedRedisUrl =
    process.env.REDIS_URL ||
    process.env.UPSTASH_REDIS_URL ||
    process.env.REDIS_CONNECTION_STRING ||
    process.env.UPSTASH_URL;

  if (hostedRedisUrl) return hostedRedisUrl;

  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  };
};

// ─── Main App Redis Client ────────────────────────────────────────────────────
// Used for: cache, idempotency, tenant resolution, redlock
const appRedisOptions = {
  keyPrefix: "nexride:",
  ...baseRedisOptions,
};

const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, appRedisOptions)
  : new Redis({
      ...resolveRedisUrl(),
      ...appRedisOptions,
    });

redisClient.on("connect", () => {
  logger.redis("App client connected (Namespaced: nexride:*)");
});

redisClient.on("ready", () => {
  logger.redis("App client ready");
});

redisClient.on("error", (err) => {
  logger.warn(`Redis App Client unavailable: ${err.message}`);
});

// ─── BullMQ Redis Connection ──────────────────────────────────────────────────
// BullMQ requires a plain ioredis connection WITHOUT keyPrefix.
const bullmqRedisOptions = {
  ...baseRedisOptions,
  maxRetriesPerRequest: null,
};

const bullmqConnection = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, bullmqRedisOptions)
  : new Redis({
      ...resolveRedisUrl(),
      ...bullmqRedisOptions,
    });

bullmqConnection.on("connect", () => {
  logger.redis("BullMQ client connected");
});

bullmqConnection.on("ready", () => {
  logger.redis("BullMQ client ready");
});

bullmqConnection.on("error", (err) => {
  logger.warn(`Redis BullMQ Client unavailable: ${err.message}`);
});

/**
 * Resolves true once the client reports "ready", false if the connection ends
 * or the probe exceeds its ceiling. A connection that is already in progress is
 * waited on rather than abandoned, so a slow-but-healthy Redis is not mistaken
 * for an unavailable one.
 */
export const isRedisAvailable = async (
  client = redisClient,
  timeoutMs = PROBE_TIMEOUT_MS,
) => {
  if (client.status === "ready") return true;

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.off("ready", onReady);
      client.off("end", onEnd);
      client.off("error", onError);
      resolve(value);
    };

    const onReady = () => finish(true);
    const onEnd = () => finish(false);
    // Transient connection errors are expected while dialling; the "ready" or
    // "end" event decides the outcome.
    const onError = () => {};

    const timer = setTimeout(() => {
      logger.warn(`Redis readiness probe timed out after ${timeoutMs}ms`);
      finish(false);
    }, timeoutMs);

    client.once("ready", onReady);
    client.once("end", onEnd);
    client.on("error", onError);

    if (client.status === "wait" || client.status === "end") {
      client.connect().catch((err) => {
        logger.warn(`Redis connect failed: ${err.message}`);
        finish(false);
      });
    }
  });
};

export { redisClient, bullmqConnection };
export default redisClient;

