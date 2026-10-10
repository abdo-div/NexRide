/**
 * Client-facing URL resolution.
 *
 * Password-reset and welcome links are security-sensitive: whoever controls the
 * domain in them controls where a live reset token is delivered. Deriving that
 * domain from `req.headers.host` or `req.headers.origin` lets anyone who can
 * send a request choose it, by sending `Host: attacker.example`. The victim
 * receives a legitimate-looking email from the real mail server containing a
 * link to the attacker's site, and the reset token with it.
 *
 * FRONTEND_URL is therefore the only accepted source. Nothing in this module
 * reads a request header.
 */

/**
 * Local-development default, applied ONLY when explicitly allowed. It is a
 * loopback address, so a poisoned Host header cannot influence it.
 */
const LOCAL_DEV_FALLBACK = "http://localhost:5173";

const normaliseUrl = (value) => String(value).trim().replace(/\/+$/, "");

/**
 * Validates the configured origin. Rejects values that are not http(s) URLs so a
 * misconfigured deployment fails loudly instead of emitting `javascript:` or
 * protocol-relative links into an email.
 */
const assertUsableUrl = (value, source) => {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `${source} must be an absolute http(s) URL (received "${value}").`,
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `${source} must use http or https (received "${value}").`,
    );
  }

  return value;
};

/**
 * Resolves the base URL of the client application.
 *
 * @param {object} [options]
 * @param {boolean} [options.allowLocalFallback] Permit the loopback default when
 *   FRONTEND_URL is unset. Used in development and tests only.
 * @returns {string} Origin with no trailing slash.
 */
export const getClientUrl = ({ allowLocalFallback = false } = {}) => {
  const configured = normaliseUrl(process.env.FRONTEND_URL || "");

  if (configured) return assertUsableUrl(configured, "FRONTEND_URL");

  if (allowLocalFallback) return LOCAL_DEV_FALLBACK;

  throw new Error(
    "FRONTEND_URL is required so that emails cannot be redirected by a forged Host header. " +
      "Set it to the public origin of the frontend, e.g. https://nexride.example.",
  );
};

export const isLocalFallbackAllowed = () =>
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

/**
 * Convenience wrapper that applies the environment-derived fallback policy.
 */
export const resolveClientUrl = () =>
  getClientUrl({ allowLocalFallback: isLocalFallbackAllowed() });
