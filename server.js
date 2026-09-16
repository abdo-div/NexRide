import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });

const { default: app } = await import("./app.js");
const { default: connectDB } = await import("./config/db.js");
await import("./config/redis.js");
const { default: logger } = await import("./utils/logger.js");

// Connect to Database
connectDB();

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.success(
    `NexRide API running in ${process.env.NODE_ENV} mode on port ${PORT} 🚀`,
  );
});

process.on("unhandledRejection", (err) => {
  logger.error(`UNHANDLED REJECTION! 💥 Shutting down... ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});
