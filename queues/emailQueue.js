import { Queue } from "bullmq";
import { redisClient } from "../config/redis.config.js";

export const emailQueue = new Queue("email-queue", {
  connection: redisClient,
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

export const addEmailToQueue = async (type, payload) => {
  await emailQueue.add(type, payload);
};
