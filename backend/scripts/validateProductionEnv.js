import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const explicitEnvFile = process.env.PRODUCTION_ENV_FILE?.trim();
const envFile = explicitEnvFile
  ? path.resolve(explicitEnvFile)
  : [
      path.join(backendRoot, "config.env"),
      path.join(backendRoot, ".env"),
      path.join(backendRoot, "..", ".env"),
    ].find((candidate) => fs.existsSync(candidate));

if (explicitEnvFile && !fs.existsSync(envFile)) {
  throw new Error(`Production environment file does not exist: ${envFile}`);
}

if (envFile) {
  dotenv.config({
    path: envFile,
    quiet: true,
    // An explicitly selected deployment file is the release source of truth,
    // not whatever values happen to exist in the operator's login shell.
    override: Boolean(explicitEnvFile),
  });
}

const { validateNodeEnv } = await import("../config/env.js");
const { validateJwtSecret } = await import("../config/jwt.js");
const { validateProductionEnv } = await import("../config/productionEnv.js");

validateNodeEnv();
validateJwtSecret();
validateProductionEnv();

console.log("Production environment validation passed.");
