import { Worker } from "bullmq";
import { bullmqConnection } from "../config/redis.js";
import { logger } from "../utils/logger.js";
import Email from "../utils/email.js";

export const emailWorker = new Worker(
  "email-queue",
  async (job) => {
    logger.info(
      { jobId: job.id, type: job.name },
      "Processing background email job",
    );

    const { user, url, bookingData } = job.data;

    switch (job.name) {
      case "BOOKING_CONFIRMATION":
        await new Email(user, url).sendBookingConfirmation(bookingData);
        logger.info(
          { jobId: job.id, userId: user?.email },
          "Booking confirmation email sent",
        );
        break;

      case "WELCOME_EMAIL":
        await new Email(user, url).sendWelcome();
        logger.info(
          { jobId: job.id, userId: user?.email },
          "Welcome email sent",
        );
        break;

      default:
        logger.warn({ jobId: job.id, type: job.name }, "Unknown email job type — skipping");
    }
  },
  { connection: bullmqConnection, prefix: "nexride" },
);

emailWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Email job completed successfully");
});

emailWorker.on("failed", (job, err) => {
  logger.error(
    { jobId: job?.id, type: job?.name, error: err.message },
    "Email job failed",
  );
});
