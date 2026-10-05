import helmet from "helmet";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://lvh.me:3000",
];

export const normalizeOrigin = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
};

const configuredOrigins = [
  ...DEFAULT_ORIGINS,
  ...(process.env.FRONTEND_DOMAIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]
  .map(normalizeOrigin)
  .filter(Boolean);
const allowedOrigins = new Set(configuredOrigins);

/**
 * FRONTEND_DOMAIN accepts a comma-separated list so staging/prod origins can be
 * whitelisted without touching code. Values are normalized to URL origins and
 * compared exactly; paths, credentials, query strings, and fragments are not
 * valid origin configuration.
 */
export const securityCors = cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);
    callback(
      null,
      normalizedOrigin && allowedOrigins.has(normalizedOrigin)
        ? origin
        : false,
    );
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Idempotency-Key",
    "X-Requested-With",
  ],
});

// Helmet Security Headers
export const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
});
// Prevent NoSQL Injection Queries ($gt, $ne, etc.)
// Express 5 defines req.query as a getter-only prototype property, so the
// package's default middleware (which reassigns req.query) throws. We reuse its
// pure `sanitize` fn and attach results without reassigning getters.
export const sanitizeNoSQL = (req, res, next) => {
  if (req.body) req.body = mongoSanitize.sanitize(req.body);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);
  if (req.query) {
    Object.defineProperty(req, "query", {
      value: mongoSanitize.sanitize(req.query),
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  next();
};

//global API rate limiter

// Global API Rate Limiter
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message:
      "Too many requests from this IP address. Please try again in 15 minutes.",
  },
});
