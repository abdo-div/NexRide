import mongoose from "mongoose";
import { redisClient } from "../config/redis.js";

export const getLiveness = (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
};

export const getReadiness = async (req, res) => {
  const isMongoReady = mongoose.connection.readyState === 1;
  const isRedisReady = redisClient.status === "ready";

  if (isMongoReady && isRedisReady) {
    return res.status(200).json({
      status: "UP",
      checks: {
        database: "CONNECTED",
        cache: "CONNECTED",
      },
    });
  }

  res.status(503).json({
    status: "DOWN",
    checks: {
      database: isMongoReady ? "CONNECTED" : "DISCONNECTED",
      cache: isRedisReady ? "CONNECTED" : "DISCONNECTED",
    },
  });
};
