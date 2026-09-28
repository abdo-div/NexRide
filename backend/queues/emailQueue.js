import { Queue } from "bullmq";
import { bullmqConnection, isRedisAvailable } from "../config/redis.js";
import logger from "../utils/logger.js";

const noopQueue = {
  add: async () => null,
  close: async () => null,
};

/**
 * The queue is created lazily on first use. Initialising it at import time made
 * every module that transitively imports this file (paymentService -> app.js)
 * wait on a Redis probe before the HTTP server could bind its port.
 */
let queuePromise = null;

const getQueue = async () => {
  if (!queuePromise) {
    queuePromise = (async () => {
      const redisReady = await isRedisAvailable(bullmqConnection);

      if (!redisReady) {
        logger.warn("Redis unavailable; background email queue is disabled.");
        // Drop the memo so a later enqueue retries once Redis recovers.
        queuePromise = null;
        return noopQueue;
      }

      const queue = new Queue("email-queue", {
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

      queue.on("error", (err) => {
        logger.error({ err: err.message }, "Email queue error");
      });

      return queue;
    })().catch((err) => {
      logger.error({ err: err.message }, "Email queue init failed");
      queuePromise = null;
      return noopQueue;
    });
  }

  return queuePromise;
};

export const addEmailToQueue = async (type, payload) => {
  const queue = await getQueue();
  if (!queue || queue === noopQueue) return null;

  return await queue.add(type, payload);
};

/**
 * Warms the queue in the background so the first enqueue is not slowed by the
 * Redis probe. Never rejects.
 */
export const warmEmailQueue = () => {
  getQueue().catch((err) => {
    logger.warn(`Email queue warm-up failed: ${err.message}`);
  });
};
