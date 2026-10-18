import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(backend, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("host verification binds evidence to the exact immutable release", () => {
  const verifier = read("deploy", "release", "verify-host.sh");
  assert.match(verifier, /40 characters/);
  assert.match(verifier, /current_link.*releases\/\$expected_sha/s);
  assert.match(verifier, /RELEASE_SHA/);
  assert.match(verifier, /WorkingDirectory/);
  assert.match(verifier, /\/srv\/nexride\/current\/backend/);
});

test("host verification covers configuration, services, storage, backups, and TLS", () => {
  const verifier = read("deploy", "release", "verify-host.sh");
  assert.match(verifier, /validateProductionEnv\.js/);
  for (const service of ["nexride.service", "nginx.service", "mongod.service", "redis-server.service"]) {
    assert.match(verifier, new RegExp(service.replace(".", "\\.")));
  }
  assert.match(verifier, /nexride-mongodb-backup\.timer/);
  assert.match(verifier, /nexride-files-backup\.timer/);
  assert.match(verifier, /nexride-monitor\.timer/);
  assert.match(verifier, /\/var\/lib\/nexride\/public/);
  assert.match(verifier, /\/var\/lib\/nexride\/private/);
  assert.match(verifier, /health\/liveness/);
  assert.match(verifier, /health\/readiness/);
  assert.match(verifier, /openssl x509 -checkend 1209600/);
});

test("the verifier fails closed and does not claim human acceptance", () => {
  const verifier = read("deploy", "release", "verify-host.sh");
  assert.match(verifier, /NO-GO/);
  assert.match(verifier, /Human acceptance, real payment\/refund/);
  assert.match(verifier, /exit 1/);
});

test("production sign-off requires two owners and every evidence class", () => {
  const signOff = read("docs", "PRODUCTION_SIGN_OFF.md");
  assert.match(signOff, /Release owner/);
  assert.match(signOff, /Operations owner/);
  assert.match(signOff, /Infrastructure and recovery evidence/);
  assert.match(signOff, /Human acceptance evidence/);
  assert.match(signOff, /real low-value payment/);
  assert.match(signOff, /real refund/);
  assert.match(signOff, /GO only when every required row is PASS/);
});
