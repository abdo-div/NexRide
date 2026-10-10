/**
 * Environment classification.
 *
 * NODE_ENV previously gated two security controls directly:
 *   - errorMiddleware showed full stack traces when NODE_ENV !== "production"
 *   - rateLimitMiddleware skipped every limiter when NODE_ENV === "development"
 *
 * Those are open gates. A typo such as "prod", "Production" or "staging", or a
 * missing variable entirely, exposed stack traces AND disabled all rate
 * limiting at the same time: one silent mistake removed two protections.
 *
 * The helpers here invert the default to fail closed. Both controls now behave
 * as if they were in production unless the environment is explicitly
 * "development", and an unrecognised NODE_ENV stops the boot rather than
 * quietly selecting a weaker posture.
 */

export const ALLOWED_NODE_ENVS = [
  "development",
  "test",
  "staging",
  "production",
];

export const getNodeEnv = () => (process.env.NODE_ENV || "").trim();

export const isProduction = () => getNodeEnv() === "production";

/**
 * Only an exact "development" enables developer affordances. Everything else,
 * including "staging", "test" and any typo, behaves like production.
 */
export const isDevelopment = () => getNodeEnv() === "development";

export const isTest = () => getNodeEnv() === "test";

/**
 * Aborts startup when NODE_ENV is missing or not one of the allowed values.
 *
 * Rejecting the value is deliberate: silently coercing "prod" or "Production"
 * into production would hide the misconfiguration, and coercing it into
 * development would enable the weaker posture the boot is meant to prevent.
 */
export const validateNodeEnv = () => {
  const value = getNodeEnv();

  if (!value) {
    throw new Error(
      `NODE_ENV is required. Set it to one of: ${ALLOWED_NODE_ENVS.join(", ")}.`,
    );
  }

  if (!ALLOWED_NODE_ENVS.includes(value)) {
    throw new Error(
      `NODE_ENV "${value}" is not recognised. Allowed values: ${ALLOWED_NODE_ENVS.join(", ")}. ` +
        "An unrecognised value would leave stack-trace and rate-limit behaviour undefined.",
    );
  }

  return value;
};
