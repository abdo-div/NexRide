import { redisClient } from "../config/redis.js";

/**
 * Tenant Subdomain Resolution Cache (1 Hour TTL)
 */
export const getCachedTenant = async (subdomain, fetchFromDb) => {
  const cacheKey = `tenant:subdomain:${subdomain}`;
  const cached = await redisClient.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const tenant = await fetchFromDb();
  if (tenant) {
    await redisClient.setex(cacheKey, 3600, JSON.stringify(tenant));
  }
  return tenant;
};

/**
 * Marketplace Vehicle Feed Cache-Aside with TTL Jitter
 */
export const getCachedVehicleFeed = async (queryString, fetchFromDb) => {
  const cacheKey = `feed:vehicles:${queryString}`;
  const cached = await redisClient.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const data = await fetchFromDb();

  // Add random TTL jitter (5-10 mins) to prevent cache stampedes
  const ttl = 300 + Math.floor(Math.random() * 300);
  await redisClient.setex(cacheKey, ttl, JSON.stringify(data));

  return data;
};

/**
 * Invalidate all vehicle feed cache keys when fleet updates occur
 */
export const invalidateVehicleFeedCache = async () => {
  const keys = await redisClient.keys("feed:vehicles:*");
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};
