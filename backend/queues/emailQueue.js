import { Queue } from "bullmq";
import { bullmqConnection, isRedisAvailable } from "../config/redis.js";
import logger from "../utils/logger.js";

const noopQueue = {
  add: async () => null,
  close: async () => null,
};

export let emailQueue = noopQueue;

const createQueue = async () => {
  const redisReady = await isRedisAvailable(bullmqConnection);

  if (!redisReady) {
    logger.warn("Redis unavailable; background email queue is disabled.");
    return noopQueue;
  }

  return new Queue("email-queue", {
    connection: bullmqConnection,
    prefix: "nexride",
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
};

emailQueue = await createQueue();

export const addEmailToQueue = async (type, payload) => {
  if (!emailQueue || typeof emailQueue.add !== "function") return null;
  if (emailQueue === noopQueue) return null;

  return await emailQueue.add(type, payload);
};
