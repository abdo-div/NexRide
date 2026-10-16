import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const backendDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryDir = path.resolve(backendDir, "..");
const readRepositoryFile = (...parts) =>
  fs.readFileSync(path.join(repositoryDir, ...parts), "utf8");

const mongod = readRepositoryFile("deploy", "mongodb", "mongod.conf");
const backup = readRepositoryFile("deploy", "mongodb", "backup.sh");
const restore = readRepositoryFile("deploy", "mongodb", "verify-restore.sh");
const backupService = readRepositoryFile(
  "deploy",
  "systemd",
  "nexride-mongodb-backup.service",
);
const backupTimer = readRepositoryFile(
  "deploy",
  "systemd",
  "nexride-mongodb-backup.timer",
);
const dbSource = fs.readFileSync(path.join(backendDir, "config", "db.js"), "utf8");
const indexScript = fs.readFileSync(
  path.join(backendDir, "scripts", "syncIndexes.js"),
  "utf8",
);

test("MongoDB is authenticated, loopback-only, and transaction capable", () => {
  assert.match(mongod, /bindIp: 127\.0\.0\.1/);
  assert.match(mongod, /authorization: enabled/);
  assert.match(mongod, /keyFile: \/etc\/mongodb-keyfile/);
  assert.match(mongod, /replSetName: rs0/);
  assert.doesNotMatch(mongod, /bindIpAll|0\.0\.0\.0/);
});

test("index reconciliation is operator-run, plan-first, and explicit", () => {
  assert.doesNotMatch(dbSource, /syncAllIndexes/);
  assert.match(indexScript, /const apply = process\.argv\.includes\("--apply"\)/);
  assert.match(indexScript, /const dryRun = !apply/);
  assert.match(indexScript, /PRODUCTION_ENV_FILE/);
});

test("nightly backups are consistent, compressed, checksummed, and retained", () => {
  assert.match(backup, /mongodump[\s\S]*--oplog/);
  assert.match(backup, /--archive="\$partial"/);
  assert.match(backup, /--gzip/);
  assert.match(backup, /gzip -t "\$partial"/);
  assert.match(backup, /sha256sum/);
  assert.match(backup, /RETENTION_DAYS/);
  assert.match(backupTimer, /OnCalendar=/);
  assert.match(backupTimer, /Persistent=true/);
  assert.match(backupService, /\/usr\/bin\/flock/);
});

test("restore drills cannot target the production database", () => {
  assert.match(restore, /sha256sum -c/);
  assert.match(restore, /--port 27018/);
  assert.match(restore, /--bind_ip 127\.0\.0\.1/);
  assert.match(restore, /--oplogReplay/);
  assert.match(restore, /--objcheck/);
  assert.doesNotMatch(restore, /MONGODB_URI|27017/);
});
