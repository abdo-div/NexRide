import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryDir = path.resolve(backendDir, "..");
const readBackend = (...parts) =>
  fs.readFileSync(path.join(backendDir, ...parts), "utf8");
const readRepository = (...parts) =>
  fs.readFileSync(path.join(repositoryDir, ...parts), "utf8");

test("the monitor covers API, services, disks, backups, and public TLS", () => {
  const monitor = readRepository("deploy", "monitoring", "check.sh");

  assert.match(monitor, /\/health\/liveness/);
  assert.match(monitor, /\/health\/readiness/);
  assert.match(monitor, /systemctl is-active/);
  assert.match(monitor, /df -P/);
  assert.match(monitor, /ExecMainExitTimestamp/);
  assert.match(monitor, /openssl s_client/);
  assert.match(monitor, /TLS_WARN_DAYS/);
});

test("alerts retry safely, repeat during failure, and report recovery", () => {
  const monitor = readRepository("deploy", "monitoring", "check.sh");

  assert.match(monitor, /ALERT_REPEAT_SECONDS/);
  assert.match(monitor, /current_state[\s\S]*previous_state/);
  assert.match(monitor, /Alert delivery failed; state was not advanced/);
  assert.match(monitor, /\[NexRide\]\[\$current_state\]/);
  assert.match(monitor, /printf 'url = "%s".*\| curl/s);
  assert.doesNotMatch(monitor, /curl[\s\\]*"\$ALERT_WEBHOOK_URL"/);
});

test("the monitor runs every minute as an unprivileged hardened service", () => {
  const service = readRepository(
    "deploy",
    "systemd",
    "nexride-monitor.service",
  );
  const timer = readRepository(
    "deploy",
    "systemd",
    "nexride-monitor.timer",
  );

  assert.match(service, /^User=nexride-monitor$/m);
  assert.match(service, /^NoNewPrivileges=true$/m);
  assert.match(service, /^ProtectSystem=strict$/m);
  assert.match(service, /^StateDirectory=nexride-monitor$/m);
  assert.match(service, /^EnvironmentFile=\/etc\/nexride\/monitor\.env$/m);
  assert.match(timer, /^OnUnitActiveSec=1m$/m);
  assert.match(timer, /^Persistent=true$/m);
});

test("journald has bounded persistent retention", () => {
  const journal = readRepository("deploy", "journald", "99-nexride.conf");

  assert.match(journal, /^Storage=persistent$/m);
  assert.match(journal, /^Compress=yes$/m);
  assert.match(journal, /^SystemMaxUse=1G$/m);
  assert.match(journal, /^SystemKeepFree=1G$/m);
  assert.match(journal, /^MaxRetentionSec=30day$/m);
});

test("critical booking, payment, and email logs expose stable event names", () => {
  const booking = readBackend("controllers", "bookingController.js");
  const payment = readBackend("controllers", "moamalatController.js");
  const email = readBackend("queues", "emailWorker.js");

  assert.match(booking, /event: "booking_created"/);
  assert.match(payment, /event: "payment_completed"/);
  assert.match(payment, /event: "payment_verification_rejected"/);
  assert.match(email, /"email_job_failed"/);
  assert.match(email, /worker\.on\("stalled"/);
  assert.doesNotMatch(
    email,
    /"email_job_failed"[\s\S]{0,250}job\.data\.(?:email|to)/,
  );
});

