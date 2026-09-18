import RedLock from "redlock";

import { redisClient } from "../config/redis.js";

const redLock = new RedLock([redisClient], {
  driftFactor: 0.01,
  retryCount: 10,
  retryDelay: 200,
  retryJitter: 200,
  automaticExtensionThreshold: 500,
});

redLock.on("error", (error) => {
  if (error.name !== "ExecutionError") {
    console.error("RedLock System Error", error);
  }
});

/**
 * Acquire an atomic lock on a specific vehicle during checkout
 * @param {string} vehicleId - ID of vehicle to lock
 * @param {number} ttlMs - Time to hold lock (default 10s)
 */

export const acquireVehicleLock = async (vehicleId, ttMs = 10000) => {
  const resource = `locks:vehicle:${vehicleId}`;
  return await redLock.acquire([resource], ttMs);
};
