import { redisClient } from "../config/redis.config.js";

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

    const cacheKey = `idempotency:${idempotencyKey}`;

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
          redisClient.setex(
            cacheKey,
            ttlSeconds,
            JSON.stringify({ statusCode: res.statusCode, body }),
          );
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
