import AppError from "../utils/appError.js";
import Company from "../models/Company_model.js";
// System reserved subdomains and platform paths that cannot be claimed by tenants
const RESERVED_SUBDOMAINS = new Set([
  "admin",
  "administrator",
  "api",
  "app",
  "assets",
  "auth",
  "billing",
  "blog",
  "cdn",
  "dashboard",
  "dev",
  "developer",
  "docs",
  "graphql",
  "help",
  "mail",
  "media",
  "portal",
  "root",
  "staging",
  "static",
  "status",
  "support",
  "sysadmin",
  "system",
  "test",
  "webhook",
  "webhooks",
  "www",
]);

/**
 * Validates and sanitizes tenant subdomains during company creation or profile update.
 * Prevents account spoofing and reserved domain collisions.
 */
export const validateSubdomain = (req, res, next) => {
  const { subdomain } = req.body;

  // If subdomain is not provided in the payload, skip validation to allow optional updates
  if (!subdomain) {
    return next();
  }

  // 1. Sanitize & Normalize input
  const formattedSubdomain = subdomain.trim().toLowerCase();

  // 2. Length Constraints Check
  if (formattedSubdomain.length < 3 || formattedSubdomain.length > 30) {
    return next(
      new AppError(
        "Subdomain must be between 3 and 30 characters in length.",
        400,
      ),
    );
  }

  // 3. Format Validation (Alphanumeric with single hyphens, no leading/trailing hyphens)
  const isValidFormat = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formattedSubdomain);
  if (!isValidFormat) {
    return next(
      new AppError(
        "Invalid subdomain format. Use lowercase letters, numbers, and single hyphens only (e.g., 'tripoli-rentals').",
        400,
      ),
    );
  }

  // 4. Reserved Subdomain Check
  if (RESERVED_SUBDOMAINS.has(formattedSubdomain)) {
    return next(
      new AppError(
        `The subdomain '${formattedSubdomain}' is reserved for platform operations and cannot be used.`,
        400,
      ),
    );
  }

  // Attach sanitized subdomain back to request body for downstream processing
  req.body.subdomain = formattedSubdomain;
  next();
};

export default validateSubdomain;
