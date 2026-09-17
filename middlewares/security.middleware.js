import helmet from "helmet";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

const allowedOrigins = [
  "http://localhost:3000",
  "http://lvh.me:3000",
  process.env.FRONTEND_DOMAIN,
];

export const securityCors = cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.some(
        (domain) => domain && origin.endsWith(domain.replace("http://", "")),
      )
    ) {
      callback(null, true);
    } else {
      callback(new Error("cors policy restriction : origin not allowed"));
    }
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
export const securityHeaders = helmet();
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
