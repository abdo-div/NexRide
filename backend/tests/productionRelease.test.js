import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(backendDir, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("CI tests both applications before publishing a checksummed artifact", () => {
  const ci = read(".github", "workflows", "ci.yml");
  assert.match(ci, /working-directory: frontend[\s\S]*run: npm test/);
  assert.match(ci, /needs: \[backend-tests, frontend-checks\]/);
  assert.match(ci, /deploy\/release\/package\.sh/);
  assert.match(ci, /\.tar\.gz\.sha256/);
});

test("production service runs through the atomic current release link", () => {
  const unit = read("deploy", "systemd", "nexride.service");
  assert.match(unit, /^WorkingDirectory=\/srv\/nexride\/current\/backend$/m);
  assert.doesNotMatch(unit, /^WorkingDirectory=\/srv\/nexride\/backend$/m);
});

test("deployment verifies artifacts and restores the previous release on failure", () => {
  const deploy = read("deploy", "release", "deploy.sh");
  assert.match(deploy, /sha256sum -c/);
  assert.match(deploy, /only regular files and directories/);
  assert.match(deploy, /--no-same-owner --no-same-permissions/);
  assert.match(deploy, /mv -Tf "\$next" "\$current"/);
  assert.match(deploy, /systemctl daemon-reload/);
  assert.match(deploy, /systemctl enable nexride/);
  assert.match(deploy, /health\/readiness/);
  assert.match(deploy, /restoring the previous release/);
  assert.match(deploy, /"\$root\/\$previous\/deploy\/systemd\/nexride\.service"/);
  assert.match(deploy, /PRODUCTION_ENV_FILE=\/etc\/nexride\/backend\.env/);
  assert.match(deploy, /chown -R root:nexride "\$incoming"/);
  assert.match(deploy, /chmod -R go-w "\$incoming"/);
});

test("explicit rollback is allowlisted by full commit SHA and health checked", () => {
  const rollback = read("deploy", "release", "rollback.sh");
  assert.match(rollback, /40-character release SHA/);
  assert.match(rollback, /target=\$releases\/\$release_sha/);
  assert.match(rollback, /health\/readiness/);
  assert.match(rollback, /restored \$previous/);
});

test("production smoke certification fails when role credentials are absent", () => {
  const smoke = read("backend", "scripts", "smokeProduction.js");
  assert.match(smoke, /SMOKE_REQUIRE_AUTH !== "false"/);
  assert.match(smoke, /status: requireAuthenticatedWorkflows \? "MISSING" : "SKIPPED"/);
  assert.match(smoke, /SMOKE_BASE_URL must use HTTPS/);
});
