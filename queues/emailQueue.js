import { Queue } from "bullmq";
import { bullmqConnection } from "../config/redis.js";

export const emailQueue = new Queue("email-queue", {
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

export const addEmailToQueue = async (type, payload) => {
  await emailQueue.add(type, payload);
};
