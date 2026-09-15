import rateLimit from "express-rate-limit";
import AppError from "../utils/appError.js";

/**
 * Global rate limiter for standard API routes
 */
export const apiLimiter = rateLimit({
  max: 100, // Max requests per window
  windowMs: 60 * 60 * 1000, // 1 hour window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(
      new AppError(
        "Too many requests from this IP, please try again in an hour!",
        429
      )
    );
  },
});

/**
 * Strict rate limiter targeting sensitive authentication endpoints
 */
export const authLimiter = rateLimit({
  max: 10, // Max 10 login/signup attempts per hour per IP
  windowMs: 60 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(
      new AppError(
        "Too many authentication attempts from this IP, please try again in an hour!",
        429
      )
    );
  },
});