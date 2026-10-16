import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = [
  path.join(backendRoot, "config.env"),
  path.join(backendRoot, ".env"),
  path.join(backendRoot, "..", ".env"),
].find((candidate) => fs.existsSync(candidate));

if (envFile) dotenv.config({ path: envFile, quiet: true });

const { validateNodeEnv } = await import("../config/env.js");
const { validateJwtSecret } = await import("../config/jwt.js");
const { validateProductionEnv } = await import("../config/productionEnv.js");

validateNodeEnv();
validateJwtSecret();
validateProductionEnv();

console.log("Production environment validation passed.");
