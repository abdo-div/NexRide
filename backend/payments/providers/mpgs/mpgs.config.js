const removeTrailingSlashes = (value) => value.replace(/\/+$/, "");

const ENV_TO_PROPERTY = Object.freeze({
  MPGS_BASE_URL: "baseUrl",
  MPGS_MERCHANT_ID: "merchantId",
  MPGS_API_PASSWORD: "apiPassword",
  MPGS_API_VERSION: "apiVersion",
  MPGS_CURRENCY: "currency",
});

/**
 * Builds an immutable MPGS configuration from an environment-like object.
 * Accepting the environment as an argument keeps this module portable and
 * makes configuration validation testable without mutating process.env.
 */
export const createMpgsConfig = (env = process.env) => {
  const config = {
    baseUrl: removeTrailingSlashes(env.MPGS_BASE_URL?.trim() ?? ""),
    merchantId: env.MPGS_MERCHANT_ID?.trim() ?? "",
    apiPassword: env.MPGS_API_PASSWORD?.trim() ?? "",
    apiVersion: env.MPGS_API_VERSION?.trim() ?? "",
    currency: env.MPGS_CURRENCY?.trim().toUpperCase() ?? "",
  };

  const missingVariables = Object.entries(ENV_TO_PROPERTY)
    .filter(([, property]) => !config[property])
    .map(([variable]) => variable);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing MPGS configuration: ${missingVariables.join(", ")}`,
    );
  }

  let gatewayUrl;
  try {
    gatewayUrl = new URL(config.baseUrl);
  } catch {
    throw new Error("MPGS_BASE_URL must be a valid HTTPS URL");
  }

  if (gatewayUrl.protocol !== "https:") {
    throw new Error("MPGS_BASE_URL must use HTTPS");
  }

  if (gatewayUrl.username || gatewayUrl.password) {
    throw new Error("MPGS_BASE_URL must not contain credentials");
  }

  if (gatewayUrl.search || gatewayUrl.hash) {
    throw new Error("MPGS_BASE_URL must not contain a query string or hash");
  }

  if (!/^\d+$/.test(config.apiVersion)) {
    throw new Error("MPGS_API_VERSION must be a positive integer");
  }

  if (Number(config.apiVersion) < 1) {
    throw new Error("MPGS_API_VERSION must be a positive integer");
  }

  if (!/^[A-Z]{3}$/.test(config.currency)) {
    throw new Error("MPGS_CURRENCY must be a three-letter currency code");
  }

  return Object.freeze(config);
};
