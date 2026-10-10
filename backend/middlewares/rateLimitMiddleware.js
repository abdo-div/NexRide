import rateLimit from "express-rate-limit";
import AppError from "../utils/appError.js";
import { isDevelopment } from "../config/env.js";

/**
 * Limiters stay active unless the run is EXACTLY "development".
 *
 * `skip: () => NODE_ENV === "development"` was an open gate: any other value,
 * including a typo or an unset variable, silently removed rate limiting from
 * every API path and left credential-stuffing and enumeration unprotected.
 */
export const apiLimiter = rateLimit({
  max: 100, // Max requests per window
  windowMs: 60 * 60 * 1000, // 1 hour window
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment(),
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
  max: 10, // Max 10 login/signup attempts per hour
  windowMs: 60 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment(),
  handler: (req, res, next) => {
    next(
      new AppError(
        "Too many authentication attempts from this IP, please try again in an hour!",
        429
      )
    );
  },
});

/**
 * Rate limiter for the gateway verification endpoints. Verification is the
 * Moamalat callback surface (and the public replay target), so a tight window
 * with the same strict 429 behaviour protects against callback storms and
 * abusers probing the endpoint for booking state.
 */
export const paymentVerificationLimiter = rateLimit({
  max: 30, // Max 30 verification calls per 15-minute window
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment(),
  handler: (req, res, next) => {
    next(
      new AppError(
        "Too many payment verification requests from this IP, please try again later!",
        429
      )
    );
  },
});