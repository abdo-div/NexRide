import { redisClient } from "../config/redis.js";

// The hold gates who may enter checkout; the PENDING_PAYMENT booking then
// holds the dates. The reaper window (see bookingExpiry.service.js) is the
// longer of the two, so a booking is always released after its own hold is.
const HOLD_TTL_SECONDS = 10 * 60; // 10 minutes hold

export const holdVehicleForCheckout = async (vehicleId, userId) => {
  const normalizedVehicleId = vehicleId?._id ?? vehicleId;
  const holdKey = `hold:vehicle:${normalizedVehicleId}`;

  // Set key only if it doesn't exist (NX = Not Exists)
  const acquired = await redisClient.set(
    holdKey,
    userId,
    "EX",
    HOLD_TTL_SECONDS,
    "NX",
  );

  if (!acquired) {
    return {
      success: false,
      message: "Vehicle is currently held by another user in checkout.",
    };
  }

  return { success: true, ttl: HOLD_TTL_SECONDS };
};

export const releaseVehicleHold = async (vehicleId) => {
  const normalizedVehicleId = vehicleId?._id ?? vehicleId;
  const holdKey = `hold:vehicle:${normalizedVehicleId}`;
  await redisClient.del(holdKey);
};
