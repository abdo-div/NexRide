import { Worker } from "bullmq";
import { redisClient } from "../config/redis.config.js";
import { logger } from "../utils/logger.js";
import consoleLogger from "../utils/chalkLogger.js";

export const emailWorker = new Worker(
  "email-queue",
  async (job) => {
    logger.info(
      { jobId: job.id, type: job.name },
      "Processing background email job",
    );
    consoleLogger.info(`Processing background job ${job.id} (${job.name})`);

    switch (job.name) {
      case "BOOKING_CONFIRMATION":
        consoleLogger.success(
          `Booking confirmation sent for booking ${job.data.bookingId}`,
        );
        break;

      case "WELCOME_EMAIL":
        consoleLogger.success(`Welcome email sent to user ${job.data.userId}`);
        break;

      default:
        consoleLogger.warn(`Unknown job type: ${job.name}`);
    }
  },
  { connection: redisClient },
);

emailWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Background job completed successfully");
});

emailWorker.on("failed", (job, err) => {
  logger.error(
    { jobId: job?.id, error: err.message },
    "Background job execution failed",
  );
  consoleLogger.error(`Job ${job?.id} failed: ${err.message}`);
});
