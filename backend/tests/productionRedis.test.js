import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootDir = path.resolve(backendDir, "..");
const readRoot = (relativePath) =>
  readFile(path.join(rootDir, relativePath), "utf8");

test("Redis listens only on loopback with protected mode and ACL authentication", async () => {
  const [config, acl] = await Promise.all([
    readRoot("deploy/redis/redis.conf"),
    readRoot("deploy/redis/nexride.acl.example"),
  ]);

  assert.match(config, /^bind 127\.0\.0\.1 -::1$/m);
  assert.match(config, /^protected-mode yes$/m);
  assert.match(config, /^aclfile \/etc\/redis\/nexride\.acl$/m);
  assert.doesNotMatch(config, /^bind (?:0\.0\.0\.0|\*)/m);
  assert.match(acl, /^user default off$/m);
  assert.match(acl, /^user nexride on >replace-/m);
  assert.match(acl, /~nexride:\*/);
  assert.match(acl, /&nexride:\*/);
  assert.match(acl, /-config/);
  assert.match(acl, /-flushall/);
});

test("Redis preserves queue state and refuses silent eviction", async () => {
  const config = await readRoot("deploy/redis/redis.conf");

  assert.match(config, /^appendonly yes$/m);
  assert.match(config, /^appendfsync everysec$/m);
  assert.match(config, /^aof-use-rdb-preamble yes$/m);
  assert.match(config, /^save 3600 1$/m);
  assert.match(config, /^stop-writes-on-bgsave-error yes$/m);
  assert.match(config, /^maxmemory [1-9][0-9]*(?:kb|mb|gb)$/m);
  assert.match(config, /^maxmemory-policy noeviction$/m);
});

test("Redis verification checks identity, persistence, memory, and ACL scope", async () => {
  const verifier = await readRoot("deploy/redis/verify.sh");

  assert.match(verifier, /REDISCLI_AUTH/);
  assert.match(verifier, /ACL WHOAMI/);
  assert.match(verifier, /aof_last_write_status/);
  assert.match(verifier, /rdb_last_bgsave_status/);
  assert.match(verifier, /maxmemory_policy/);
  assert.match(verifier, /outside:deployment:probe/);
  assert.doesNotMatch(verifier, /--pass(?:word)?\b/);
});

test("the Redis systemd override contains the service blast radius", async () => {
  const unit = await readRoot(
    "deploy/systemd/redis-server.service.d/override.conf",
  );

  assert.match(unit, /^NoNewPrivileges=true$/m);
  assert.match(unit, /^ProtectSystem=strict$/m);
  assert.match(unit, /^ReadWritePaths=\/var\/lib\/redis \/var\/log\/redis \/run\/redis$/m);
  assert.match(unit, /^RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6$/m);
});
