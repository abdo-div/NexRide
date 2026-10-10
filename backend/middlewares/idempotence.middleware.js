import { redisClient, isRedisAvailable } from "../config/redis.js";

/**
 * Redis is only a deduplication convenience: the downstream transaction is the
 * authoritative gate for a request. When Redis is unreachable the request passes
 * through unchanged so an offline cache/queue can never surface as a 500 to the
 * client (ioredis would otherwise reject with "Connection is closed.").
 */
const IDEMPOTENCY_PROBE_TIMEOUT_MS = Number(process.env.REDIS_PROBE_TIMEOUT_MS) || 500;

/**
 * Ensures repeated API requests with the same Idempotency-Key header return identical responses without re-executing business logic.
 * @param {number} ttlSeconds - Duration to retain response in Redis (default 24h)
 */
export const idempotency =
  (ttlSeconds = 86400) =>
  async (req, res, next) => {
    const idempotencyKey = req.headers["idempotency-key"];

    // Skip if no idempotency key is passed in headers
    if (!idempotencyKey) {
      return next();
    }

    // Skip deduplication when Redis is not available; the request still runs
    // its normal business logic (see bookingController for the same pattern).
    const redisReady = await isRedisAvailable(redisClient, IDEMPOTENCY_PROBE_TIMEOUT_MS);
    if (!redisReady) {
      return next();
    }

    const actorId = req.user?._id || req.user?.id;
    const actorScope = actorId ? actorId.toString() : "anonymous";
    const cacheKey = `idempotency:${actorScope}:${idempotencyKey}`;

    try {
      const cachedResponse = await redisClient.get(cacheKey);

      if (cachedResponse) {
        const { statusCode, body } = JSON.parse(cachedResponse);
        return res.status(statusCode).json(body);
      }

      // Intercept res.json to capture response body for caching
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient
            .setex(
              cacheKey,
              ttlSeconds,
              JSON.stringify({ statusCode: res.statusCode, body }),
            )
            .catch(() => {
              /* best-effort cache write only */
            });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
