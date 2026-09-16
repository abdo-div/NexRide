import Redis from "ioredis";
import logger from "../utils/logger.js";

const redisOptions = {
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
  ? new Redis(process.env.REDIS_URL, redisOptions)
  : new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      ...redisOptions,
    });

redisClient.on("connect", () => {
  logger.redis("Connected successfully (Namespaced: nexride:*)");
});

redisClient.on("error", (err) => {
  logger.error(`Redis Client Error: ${err.message}`);
});

export default redisClient;
