import mongoose from "mongoose";
import {
  isRedisAvailable,
  isRedisEnabled,
  redisClient,
} from "../config/redis.js";

export const getLiveness = (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
};

export const getReadiness = async (req, res) => {
  const isMongoReady = mongoose.connection.readyState === 1;
  const isRedisReady = await isRedisAvailable(redisClient);

  if (isMongoReady && (isRedisReady || !isRedisEnabled())) {
    return res.status(200).json({
      status: "UP",
      checks: {
        database: "CONNECTED",
        cache: isRedisReady ? "CONNECTED" : "DISABLED",
      },
    });
  }

  res.status(503).json({
    status: "DOWN",
    checks: {
      database: isMongoReady ? "CONNECTED" : "DISCONNECTED",
      cache: isRedisEnabled()
        ? isRedisReady
          ? "CONNECTED"
          : "DISCONNECTED"
        : "DISABLED",
    },
  });
};
