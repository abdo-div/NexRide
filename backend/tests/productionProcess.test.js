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
const serverSource = fs.readFileSync(path.join(backendDir, "server.js"), "utf8");
const unitSource = fs.readFileSync(
  path.join(repositoryDir, "deploy", "systemd", "nexride.service"),
  "utf8",
);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(backendDir, "package.json"), "utf8"),
);

test("production runtime is pinned to the supported Node major", () => {
  assert.equal(packageJson.engines.node, ">=24 <25");
});

test("systemd validates configuration before starting one supervised process", () => {
  assert.match(unitSource, /^User=nexride$/m);
  assert.match(unitSource, /^EnvironmentFile=\/etc\/nexride\/backend\.env$/m);
  assert.match(
    unitSource,
    /^ExecStartPre=\/usr\/bin\/node scripts\/validateProductionEnv\.js$/m,
  );
  assert.match(unitSource, /^ExecStart=\/usr\/bin\/node server\.js$/m);
  assert.match(unitSource, /^Type=simple$/m);
  assert.match(unitSource, /^Restart=on-failure$/m);
  assert.doesNotMatch(unitSource, /^(?:ExecStart|Environment)=.*(?:cluster|pm2)/im);
});

test("systemd gives the application enough time for its graceful shutdown", () => {
  const applicationTimeout = Number(
    serverSource.match(/}, (\d+)\);\s*forceExitTimer\.unref/s)?.[1],
  );
  const serviceTimeout = Number(
    unitSource.match(/^TimeoutStopSec=(\d+)$/m)?.[1],
  );

  assert.equal(applicationTimeout, 15000);
  assert.ok(serviceTimeout * 1000 > applicationTimeout);
  assert.match(unitSource, /^KillSignal=SIGTERM$/m);
});

test("fatal process errors enter the same idempotent shutdown path", () => {
  assert.match(serverSource, /let shuttingDown = false/);
  assert.match(serverSource, /if \(shuttingDown\)/);
  assert.match(serverSource, /process\.on\("unhandledRejection"/);
  assert.match(serverSource, /process\.on\("uncaughtException"/);
  assert.match(serverSource, /shutdown\("uncaughtException", 1\)/);
});
