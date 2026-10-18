import path from "node:path";

const MONGO_VARIABLES = [
  "MONGODB_URI",
  "MONGO_URI",
  "DATABASE_URI",
  "DATABASE_URL",
  "DATABASE",
];
const REDIS_URL_VARIABLES = [
  "REDIS_URL",
  "UPSTASH_REDIS_URL",
  "REDIS_CONNECTION_STRING",
  "UPSTASH_URL",
];
const PLACEHOLDER_PATTERN =
  /(?:replace|change[-_ ]?me|example\.(?:com|test)|your[-_]|<[^>]+>|xxx|todo|tbd)/i;

const valueOf = (env, name) => String(env[name] ?? "").trim();
const configured = (env, name) => valueOf(env, name).length > 0;

const parseUrl = (value, protocols) => {
  try {
    const parsed = new URL(value);
    return protocols.includes(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
};

const isLoopbackHost = (hostname) =>
  ["localhost", "127.0.0.1", "::1"].includes(hostname.toLowerCase());

const pathsOverlap = (left, right) => {
  const isInside = (relative) =>
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative));
  return (
    isInside(path.relative(left, right)) ||
    isInside(path.relative(right, left))
  );
};

const validatePublicOrigin = (env, problems) => {
  const value = valueOf(env, "FRONTEND_URL");
  if (PLACEHOLDER_PATTERN.test(value)) {
    problems.push("FRONTEND_URL still contains a placeholder value.");
    return;
  }
  const parsed = parseUrl(value, ["https:"]);
  if (
    !parsed ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    isLoopbackHost(parsed.hostname)
  ) {
    problems.push(
      "FRONTEND_URL must be the public HTTPS origin only (no path, credentials, query, fragment, or localhost).",
    );
    return;
  }

  const allowedOrigins = valueOf(env, "FRONTEND_DOMAIN")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!allowedOrigins.includes(parsed.origin)) {
    problems.push(
      "FRONTEND_DOMAIN must include the exact FRONTEND_URL origin for credentialed browser requests.",
    );
  }
};

const validateMongo = (env, problems) => {
  const configuredUris = MONGO_VARIABLES.filter((name) => configured(env, name));
  if (configuredUris.length === 0) {
    problems.push(
      "MONGODB_URI is required in production; the localhost development fallback is not allowed.",
    );
    return;
  }
  if (configuredUris.length > 1) {
    problems.push(
      `Configure only one MongoDB URI variable (found: ${configuredUris.join(", ")}).`,
    );
    return;
  }

  const value = valueOf(env, configuredUris[0]);
  if (PLACEHOLDER_PATTERN.test(value)) {
    problems.push(`${configuredUris[0]} still contains a placeholder value.`);
    return;
  }
  const parsed = parseUrl(value, ["mongodb:", "mongodb+srv:"]);
  if (!parsed) {
    problems.push("The configured MongoDB URI must use mongodb:// or mongodb+srv://.");
    return;
  }
  if (!parsed.username || !parsed.password) {
    problems.push(
      "The production MongoDB URI must include dedicated application credentials.",
    );
  }
  if (!parsed.pathname || parsed.pathname === "/") {
    problems.push("The production MongoDB URI must name the application database.");
  }
  if (parsed.protocol === "mongodb:" && !parsed.searchParams.get("replicaSet")) {
    problems.push(
      "A mongodb:// production URI must name replicaSet because booking workflows use transactions.",
    );
  }
};

const validateRedis = (env, problems) => {
  const enabled = valueOf(env, "REDIS_ENABLED").toLowerCase();
  if (!["true", "false"].includes(enabled)) {
    problems.push("REDIS_ENABLED must be explicitly set to true or false.");
    return;
  }
  if (enabled === "false") {
    if (valueOf(env, "EMAIL_QUEUE_ENABLED").toLowerCase() === "true") {
      problems.push("EMAIL_QUEUE_ENABLED cannot be true when REDIS_ENABLED is false.");
    }
    return;
  }

  const redisUrls = REDIS_URL_VARIABLES.filter((name) => configured(env, name));
  if (redisUrls.length > 1) {
    problems.push(
      `Configure only one Redis URL variable (found: ${redisUrls.join(", ")}).`,
    );
    return;
  }
  if (redisUrls.length === 1) {
    const redisUrl = valueOf(env, redisUrls[0]);
    if (PLACEHOLDER_PATTERN.test(redisUrl)) {
      problems.push(`${redisUrls[0]} still contains a placeholder value.`);
      return;
    }

    const parsed = parseUrl(redisUrl, ["redis:", "rediss:"]);
    if (!parsed) {
      problems.push("The configured Redis URL must use redis:// or rediss://.");
      return;
    }
    if (!parsed.username || !parsed.password) {
      problems.push(
        "The production Redis URL must include a named ACL user and password.",
      );
    }
    if (parsed.protocol === "redis:" && !isLoopbackHost(parsed.hostname)) {
      problems.push(
        "A remote production Redis URL must use rediss:// so credentials and traffic are encrypted.",
      );
    }
    return;
  }

  const host = valueOf(env, "REDIS_HOST");
  if (!host) {
    problems.push(
      "Redis is enabled, so configure REDIS_URL or an explicit REDIS_HOST (localhost is allowed on a single VPS).",
    );
    return;
  }
  if (!isLoopbackHost(host)) {
    problems.push(
      "REDIS_HOST must be loopback in production; use a rediss:// REDIS_URL for a remote Redis service.",
    );
  }

  const redisPort = Number(valueOf(env, "REDIS_PORT"));
  if (!Number.isInteger(redisPort) || redisPort < 1 || redisPort > 65535) {
    problems.push("REDIS_PORT must be an integer from 1 to 65535.");
  }
  for (const name of ["REDIS_USERNAME", "REDIS_PASSWORD"]) {
    const value = valueOf(env, name);
    if (!value) problems.push(`${name} is required when Redis is enabled.`);
    else if (PLACEHOLDER_PATTERN.test(value)) {
      problems.push(`${name} still contains a placeholder value.`);
    }
  }
};

const validateSmtp = (env, problems) => {
  for (const name of [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USERNAME",
    "SMTP_PASSWORD",
    "EMAIL_FROM",
  ]) {
    if (!configured(env, name)) problems.push(`${name} is required in production.`);
    else if (PLACEHOLDER_PATTERN.test(valueOf(env, name))) {
      problems.push(`${name} still contains a placeholder value.`);
    }
  }
  const port = Number(valueOf(env, "SMTP_PORT"));
  if (configured(env, "SMTP_PORT") && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    problems.push("SMTP_PORT must be an integer from 1 to 65535.");
  }
  if (!/^\S+@\S+\.\S+$/.test(valueOf(env, "EMAIL_FROM"))) {
    problems.push("EMAIL_FROM must be a valid sender email address.");
  }
  if (!["true", "false"].includes(valueOf(env, "SMTP_SECURE").toLowerCase())) {
    problems.push("SMTP_SECURE must be explicitly set to true or false.");
  }
};

const validateMoamalat = (env, problems) => {
  if (!["prod", "production"].includes(valueOf(env, "MOAMALAT_ENV").toLowerCase())) {
    problems.push("MOAMALAT_ENV must be production (or prod) for a production launch.");
  }
  for (const name of ["MOAMALAT_MID", "MOAMALAT_TID", "MOAMALAT_SECURE_KEY"]) {
    if (!configured(env, name)) problems.push(`${name} is required in production.`);
    else if (PLACEHOLDER_PATTERN.test(valueOf(env, name))) {
      problems.push(`${name} still contains a placeholder value.`);
    }
  }
  const key = valueOf(env, "MOAMALAT_SECURE_KEY");
  if (key && (!/^[a-fA-F0-9]+$/.test(key) || key.length < 32 || key.length % 2 !== 0)) {
    problems.push(
      "MOAMALAT_SECURE_KEY must be an even-length hexadecimal key of at least 16 bytes.",
    );
  }
};

/**
 * Validate deployment-only requirements without returning or logging secrets.
 * All problems are reported together so an operator can fix the VPS config in
 * one pass instead of discovering missing values one restart at a time.
 */
export const validateProductionEnv = (env = process.env) => {
  const problems = [];

  if (valueOf(env, "NODE_ENV") !== "production") {
    problems.push("NODE_ENV must be exactly production.");
  }

  const port = Number(valueOf(env, "PORT"));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push("PORT must be an integer from 1 to 65535.");
  }

  if (valueOf(env, "BIND_HOST") !== "127.0.0.1") {
    problems.push(
      "BIND_HOST must be 127.0.0.1 in production so only the local reverse proxy can reach Node directly.",
    );
  }

  for (const name of ["JWT_SECRET", "JWT_EXPIRES_IN", "JWT_COOKIE_EXPIRES_IN"]) {
    const value = valueOf(env, name);
    if (!value) problems.push(`${name} is required in production.`);
    else if (PLACEHOLDER_PATTERN.test(value)) problems.push(`${name} still contains a placeholder value.`);
  }
  const cookieDays = Number(valueOf(env, "JWT_COOKIE_EXPIRES_IN"));
  if (!Number.isFinite(cookieDays) || cookieDays <= 0) {
    problems.push("JWT_COOKIE_EXPIRES_IN must be a positive number of days.");
  }

  validatePublicOrigin(env, problems);
  validateMongo(env, problems);
  validateRedis(env, problems);

  const storagePaths = {};
  for (const name of ["PUBLIC_STORAGE_DIR", "PRIVATE_STORAGE_DIR"]) {
    const value = valueOf(env, name);
    if (!value || PLACEHOLDER_PATTERN.test(value) || !path.isAbsolute(value)) {
      problems.push(`${name} must be an absolute persistent path in production.`);
    } else {
      storagePaths[name] = path.resolve(value);
    }
  }
  if (
    storagePaths.PUBLIC_STORAGE_DIR &&
    storagePaths.PRIVATE_STORAGE_DIR &&
    pathsOverlap(
      storagePaths.PUBLIC_STORAGE_DIR,
      storagePaths.PRIVATE_STORAGE_DIR,
    )
  ) {
    problems.push(
      "PUBLIC_STORAGE_DIR and PRIVATE_STORAGE_DIR must be separate, non-overlapping directories.",
    );
  }

  const googleValues = [
    configured(env, "GOOGLE_CLIENT_ID"),
    configured(env, "GOOGLE_CLIENT_SECRET"),
  ];
  if (googleValues.some(Boolean) && !googleValues.every(Boolean)) {
    problems.push(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must either both be configured or both be omitted.",
    );
  } else if (
    googleValues.every(Boolean) &&
    ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"].some((name) =>
      PLACEHOLDER_PATTERN.test(valueOf(env, name)),
    )
  ) {
    problems.push("Google authentication configuration still contains a placeholder value.");
  }

  validateSmtp(env, problems);
  validateMoamalat(env, problems);

  if (problems.length > 0) {
    throw new Error(
      `Production environment validation failed:\n${problems
        .map((problem, index) => `  ${index + 1}. ${problem}`)
        .join("\n")}`,
    );
  }

  return true;
};
