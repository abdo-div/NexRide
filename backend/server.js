import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load the environment file wherever it actually lives, regardless of the
// working directory the server is started from. Candidates are checked in
// order and the first one that exists wins: backend/config.env (legacy),
// backend/.env, then the project-root .env.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = [
  path.join(__dirname, "config.env"),
  path.join(__dirname, ".env"),
  path.join(__dirname, "..", ".env"),
].find((candidate) => fs.existsSync(candidate));

if (envFile) {
  dotenv.config({ path: envFile });
}

const { default: mongoose } = await import("mongoose");
const { default: app } = await import("./app.js");
const { default: connectDB } = await import("./config/db.js");
const { default: logger } = await import("./utils/logger.js");
const { default: chalkLogger } = await import("./utils/chalkLogger.js");

const { redisClient, bullmqConnection } = await import("./config/redis.js");

// Connect to Database
connectDB();

const PORT = process.env.PORT || 3000;

let listening = false;

const server = app.listen(PORT, () => {
  // On Windows a second process can bind a port that is already in use
  // (SO_REUSEADDR), which fires this callback even though the process does not
  // own the socket. Only announce success when the socket was really acquired.
  if (!server.listening) return;
  listening = true;

  chalkLogger.success(
    `NexRide API running in ${process.env.NODE_ENV} mode on port ${PORT} 🚀`,
  );
  logger.info({ port: PORT, env: process.env.NODE_ENV }, "NexRide API started");
});

// Without this handler a port conflict crashes the process with a raw stack
// trace instead of an actionable message.
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n[FAIL] Port ${PORT} is already in use - another NexRide API instance is already running.\n` +
        `       Requests will keep reaching that instance, so stop it first:\n` +
        `         netstat -ano | findstr :${PORT}\n` +
        `         taskkill /PID <pid> /F\n` +
        `       Or set a different PORT in config.env.\n`,
    );
  } else {
    console.error(`[FAIL] HTTP server error: ${err.message}`);
  }
  logger.error({ err: err.message, code: err.code }, "HTTP server error");
  process.exit(1);
});

// -----------------------------------------------------------------------------
// Background workers start only after the API is accepting traffic, so an
// unreachable Redis or SMTP host can never block startup.
// -----------------------------------------------------------------------------

const { startEmailWorker } = await import("./queues/emailWorker.js");
const { warmEmailQueue } = await import("./queues/emailQueue.js");

let emailWorker = { close: async () => null };

startEmailWorker()
  .then((worker) => {
    emailWorker = worker;
  })
  .catch((err) => {
    logger.warn({ err: err.message }, "Email worker failed to start");
  });

warmEmailQueue();

// -----------------------------------------------------------------------------
// Graceful Shutdown (SIGTERM / SIGINT)
// -----------------------------------------------------------------------------
let forceExitTimer = null;

const shutdown = async (signal, exitCode = 0) => {
  chalkLogger.info(`Received ${signal}. Gracefully shutting down...`);

  forceExitTimer = setTimeout(() => {
    logger.warn("Graceful shutdown timed out; forcing exit.");
    process.exit(1);
  }, 15000);
  forceExitTimer.unref();

  // Stop accepting new connections and wait for in-flight requests to finish
  const closeHttp = () => {
    logger.info("HTTP server closed.");
    cleanupResources(exitCode);
  };

  if (!listening) {
    // Never bound the port, so there are no connections to drain.
    closeHttp();
    return;
  }

  server.close(closeHttp);
};

const cleanupResources = async (exitCode = 0) => {
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

  if (forceExitTimer) clearTimeout(forceExitTimer);
  process.exit(exitCode);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (err) => {
  logger.error(`UNHANDLED REJECTION! 💥 Shutting down... ${err.message}`);
  shutdown("unhandledRejection", 1);
});
