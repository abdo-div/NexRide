import pino from "pino";
import chalkLogger from "./chalkLogger.js"; // Adjust path if needed

// Standard Pino structured logger for production & service logs
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Service-scoped logging helpers used across config modules
logger.redis = (msg) => logger.info({ channel: "redis" }, msg);
logger.database = (msg) => logger.info({ channel: "database" }, msg);

// Custom dev/console logger wrapper combining Pino with your Chalk logger
export const devLogger = {
  ...chalkLogger,
  redis: chalkLogger.redis,
  database: (msg) => chalkLogger.info(msg),
  pino: logger,
};

export default logger;
