import { Worker } from "bullmq";
import { bullmqConnection } from "../config/redis.js";
import { sendEmail } from "../utils/email.js";
import logger from "../utils/logger.js";

export const emailWorker = new Worker(
  "email-queue",
  async (job) => {
    logger.info(
      { jobId: job.id, type: job.name },
      "Processing queued background email",
    );

    switch (job.name) {
      case "BOOKING_CONFIRMATION":
        await sendEmail({
          to: job.data.email,
          subject: `Booking Confirmation #${job.data.bookingId}`,
          html: `<h1>Booking Confirmed!</h1><p>Your booking for vehicle ${job.data.vehicleName} is confirmed.</p>`,
        });
        break;

      case "WELCOME_EMAIL":
        await sendEmail({
          to: job.data.email,
          subject: "Welcome to NexRide!",
          html: `<h1>Welcome ${job.data.name}!</h1><p>Thank you for joining NexRide.</p>`,
        });
        break;

      default:
        logger.warn(
          { jobName: job.name },
          "Unhandled background email job type",
        );
    }
  },
  { connection: bullmqConnection, prefix: "nexride" },
);
