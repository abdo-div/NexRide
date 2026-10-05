import pino from "pino";
import chalkLogger from "./chalkLogger.js"; // Adjust path if needed

// Credentials that must never reach a log sink. Log aggregation, SIEMs and
// container stdout all tend to outlive the session that created them, so a live
// JWT written to disk is effectively a session takeover waiting to be replayed.
//
// Both dot and bracket forms are listed: pino matches the literal key, so
// `req.headers.authorization` would not catch a client that sends
// `Authorization` with different casing.
export const REDACT_CENSOR = "[REDACTED]";

export const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["x-access-token"]',
  'req.headers["set-cookie"]',
  'res.headers["set-cookie"]',
  "req.headers.Authorization",
  "req.headers.Cookie",
  'req.headers["Set-Cookie"]',
  'res.headers["Set-Cookie"]',
  // Body carriers used by the auth and payment flows. `body.*` is deliberately
  // NOT used: it would also censor every harmless field in the payload.
  // pino matches these paths relative to the object being logged, so both the
  // bare `body` form and the nested `req.body` form are listed.
  "body.password",
  "body.token",
  "body.jwt",
  "body.otp",
  "req.body.password",
  "req.body.token",
  "password",
  "token",
  "jwt",
];

// Standard Pino structured logger for production & service logs
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: REDACT_PATHS,
    censor: REDACT_CENSOR,
    // Keep the key names in the output so the shape stays stable for log
    // parsers and a redacted field is visibly redacted rather than absent.
    remove: false,
  },
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
