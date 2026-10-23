/**
 * Standalone index migration runner for deployment pipelines.
 *
 * Models set `autoIndex: false` in production, so indexes must be created
 * explicitly. This connects, reports any duplicates that would block a unique
 * index, then reconciles every model's indexes with its schema.
 *
 * Usage:
 *   npm run sync-indexes                 # report only, change nothing
 *   npm run sync-indexes -- --apply      # reconcile after reviewing the plan
 *
 * Run once per deploy, before the new application version starts serving. It
 * is safe to run when indexes are already correct.
 */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const explicitEnvFile = process.env.PRODUCTION_ENV_FILE?.trim();
const envFile = explicitEnvFile
  ? path.resolve(explicitEnvFile)
  : [
      path.join(__dirname, "..", "config.env"),
      path.join(__dirname, "..", ".env"),
      path.join(__dirname, "..", "..", ".env"),
    ].find((candidate) => fs.existsSync(candidate));

if (explicitEnvFile && !fs.existsSync(envFile)) {
  throw new Error(`Production environment file does not exist: ${envFile}`);
}

if (envFile) {
  dotenv.config({
    path: envFile,
    quiet: true,
    override: Boolean(explicitEnvFile),
  });
}

const { default: mongoose } = await import("mongoose");
const { default: logger } = await import("../utils/logger.js");
const {
  syncAllIndexes,
  findUniqueIndexViolations,
} = await import("../utils/syncIndexes.js");

// Importing the models registers them on the connection, which is what the
// sync iterates over. Without this the registry is empty and nothing happens.
const MODEL_MODULES = [
  "../models/User_model.js",
  "../models/Company_model.js",
  "../models/vehicle_model.js",
  "../models/booking_model.js",
  "../models/payment_model.js",
  "../models/Refund_model.js",
  "../models/SupportTicket_model.js",
  "../models/review_model.js",
  "../models/Maintenance_model.js",
  "../models/PlatformSettings_model.js",
];

const apply = process.argv.includes("--apply");
const dryRun = !apply;

const getMongoUri = () =>
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URI ||
  process.env.DATABASE_URL ||
  process.env.DATABASE;

const uri = getMongoUri();
if (!uri) {
  console.error(
    "No database URI found. Set MONGODB_URI (or DATABASE_URI) before running.",
  );
  process.exit(1);
}

let exitCode = 0;

try {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 60000,
  });
  logger.database(`Connected to host: ${mongoose.connection.host}`);

  for (const modulePath of MODEL_MODULES) {
    await import(modulePath);
  }

  const { duplicates } = await findUniqueIndexViolations({ enabled: true });
  const duplicateFields = Object.keys(duplicates);

  if (duplicateFields.length > 0) {
    console.error(
      "\n[FAIL] Existing duplicates would prevent unique index creation:\n" +
        duplicateFields.map((field) => `  - ${field}`).join("\n") +
        "\nResolve these before syncing indexes.\n",
    );
    exitCode = 1;
  }

  const { results } = await syncAllIndexes({ enabled: true, dryRun });

  for (const entry of results) {
    if (entry.status === "failed") {
      console.error(`  [FAIL] ${entry.model}: ${entry.error}`);
      exitCode = 1;
    } else if (dryRun) {
      console.log(
        `  [PLAN] ${entry.model}: create ${entry.toCreate.length}, drop ${entry.toDrop.length}`,
      );
      for (const index of entry.toCreate) {
        console.log(`         + ${JSON.stringify(index)}`);
      }
      for (const index of entry.toDrop) console.log(`         - ${index}`);
    } else {
      console.log(`  [OK]   ${entry.model}: ${entry.indexNames.length} indexes`);
    }
  }

  if (exitCode === 0) {
    console.log(
      dryRun ? "\nDry run complete. No changes applied.\n" : "\nIndex sync complete.\n",
    );
  }
} catch (err) {
  console.error(`\n[FAIL] Index migration error: ${err.message}\n`);
  logger.error({ err: err.message }, "Index migration failed");
  exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}

process.exit(exitCode);
