import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });

const { default: mongoose } = await import("mongoose");
const { default: app } = await import("./app.js");
const { default: connectDB } = await import("./config/db.js");
const { default: logger } = await import("./utils/logger.js");
const { default: chalkLogger } = await import("./utils/chalkLogger.js");

// Start BullMQ email worker (listens for queued email jobs once Redis connects)
const { emailWorker } = await import("./queues/emailWorker.js");

const { redisClient, bullmqConnection } = await import("./config/redis.js");

// Connect to Database
connectDB();

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  chalkLogger.success(
    `NexRide API running in ${process.env.NODE_ENV} mode on port ${PORT} 🚀`,
  );
  logger.info({ port: PORT, env: process.env.NODE_ENV }, "NexRide API started");
});

// -----------------------------------------------------------------------------
// Graceful Shutdown (SIGTERM / SIGINT)
// -----------------------------------------------------------------------------
const shutdown = async (signal, exitCode = 0) => {
  chalkLogger.info(`Received ${signal}. Gracefully shutting down...`);

  const forceExitTimer = setTimeout(() => {
    logger.warn("Graceful shutdown timed out; forcing exit.");
    process.exit(1);
  }, 15000);
  forceExitTimer.unref();

  // Stop accepting new connections and wait for in-flight requests to finish
  server.close(async () => {
    logger.info("HTTP server closed.");

    // Stop the BullMQ email worker and finish in-flight jobs
    try {
      await emailWorker.close();
      logger.info("Email worker closed.");
    } catch (err) {
      logger.error(`Email worker close error: ${err.message}`);
    }

    // Close the database connection
    try {
      await mongoose.disconnect();
      logger.info("MongoDB disconnected.");
    } catch (err) {
      logger.error(`MongoDB disconnect error: ${err.message}`);
    }

    // Close Redis connections (app client + BullMQ client)
    try {
      await Promise.all([redisClient.quit(), bullmqConnection.quit()]);
      logger.info("Redis connections closed.");
    } catch (err) {
      logger.error(`Redis close error: ${err.message}`);
    }

    clearTimeout(forceExitTimer);
    process.exit(exitCode);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (err) => {
  logger.error(`UNHANDLED REJECTION! 💥 Shutting down... ${err.message}`);
  shutdown("unhandledRejection", 1);
});
