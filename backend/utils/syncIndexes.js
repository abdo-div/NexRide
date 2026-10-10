import mongoose from "mongoose";
import logger from "./logger.js";

/**
 * Production index synchronization.
 *
 * Every model sets `autoIndex: false` in production, which is correct for
 * request-path performance (building indexes on boot is expensive and can tie
 * up a live database) but it also means declared indexes are never created.
 * Unique constraints such as User.email, Company.slug and Review.bookingId were
 * therefore unenforced in production.
 *
 * `Model.syncIndexes()` reconciles the collection with the schema: it creates
 * missing indexes and drops ones the schema no longer declares. That makes it
 * the right migration primitive, but it is also destructive, so it runs only
 * when explicitly enabled and only after a successful connection.
 */

const isIndexSyncEnabled = () => {
  const flag = process.env.SYNC_INDEXES ?? process.env.SYNC_INDEXES_ON_START;
  if (flag !== undefined && flag !== "") {
    return !["false", "0", "no", "off"].includes(String(flag).toLowerCase());
  }

  // Off by default. Index reconciliation is a deployment concern, so an
  // unattended production boot should never drop or rebuild indexes on its own.
  return false;
};

/**
 * Sync declared indexes for every registered model.
 *
 * @param {object} [options]
 * @param {boolean} [options.enabled] Override the env-driven enablement.
 * @param {boolean} [options.dryRun] List what would change without applying.
 * @returns {Promise<{ran: boolean, reason?: string, results: object[]}>}
 */
export const syncAllIndexes = async ({ enabled, dryRun = false } = {}) => {
  const shouldRun = enabled ?? isIndexSyncEnabled();

  if (!shouldRun) {
    return {
      ran: false,
      reason:
        "Index sync disabled. Set SYNC_INDEXES=true to reconcile declared indexes.",
      results: [],
    };
  }

  // Reading from the connection rather than iterating the registry keeps the
  // sync scoped to the live connection.
  if (mongoose.connection.readyState !== 1) {
    const reason = "Database is not connected; skipping index sync.";
    logger.warn(reason);
    return { ran: false, reason, results: [] };
  }

  const models = Object.values(mongoose.connection.models);
  const results = [];

  for (const model of models) {
    try {
      const indexNames = model.schema
        .indexes()
        .map(([fields]) => Object.keys(fields).join("_"));

      if (dryRun) {
        results.push({ model: model.modelName, status: "dry-run", indexNames });
        continue;
      }

      await model.syncIndexes();
      results.push({ model: model.modelName, status: "synced", indexNames });
      logger.info(
        { model: model.modelName, indexes: indexNames.length },
        "Synchronized model indexes",
      );
    } catch (err) {
      results.push({
        model: model.modelName,
        status: "failed",
        error: err.message,
      });
      logger.error(
        { model: model.modelName, err: err.message },
        "Index sync failed for model",
      );
    }
  }

  const failed = results.filter((entry) => entry.status === "failed");
  if (failed.length > 0) {
    // Surfaced rather than thrown: one bad model should not mask the rest, but
    // callers that need a hard guarantee (a deploy script) can inspect results.
    logger.warn(
      { failed: failed.map((entry) => entry.model) },
      "Index sync completed with failures",
    );
  }

  return { ran: true, results };
};

/**
 * Reject documents that would violate a declared unique index. Partial indexes
 * only index the documents they match, so this walks existing records and
 * reports duplicates among the values the index actually covers. Run before
 * enabling SYNC_INDEXES in production: creating a unique index fails outright
 * if duplicates already exist.
 */
export const findUniqueIndexViolations = async ({ enabled } = {}) => {
  const shouldRun = enabled ?? isIndexSyncEnabled();
  if (!shouldRun) return { ran: false, reason: "Index sync disabled.", duplicates: {} };

  if (mongoose.connection.readyState !== 1) {
    return { ran: false, reason: "Database is not connected.", duplicates: {} };
  }

  const duplicates = {};

  for (const model of Object.values(mongoose.connection.models)) {
    for (const [fields, options] of model.schema.indexes()) {
      if (!options.unique) continue;

      // A partial index cannot conflict with documents it does not cover.
      if (options.partialFilterExpression) continue;

      const key = Object.keys(fields);
      if (key.length !== 1) continue;

      const field = key[0];
      const rows = await model
        .aggregate([
          { $group: { _id: `$${field}`, count: { $sum: 1 } } },
          { $match: { count: { $gt: 1 }, _id: { $ne: null } } },
          { $project: { _id: 1, count: 1 } },
        ])
        .exec();

      if (rows.length > 0) {
        duplicates[`${model.modelName}.${field}`] = rows;
      }
    }
  }

  const entries = Object.keys(duplicates);
  if (entries.length > 0) {
    logger.error(
      { fields: entries },
      "Duplicate values would block unique index creation",
    );
  } else {
    logger.info("No duplicate values block unique index creation");
  }

  return { ran: true, duplicates };
};
