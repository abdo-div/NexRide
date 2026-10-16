# Production Redis on the NexRide VPS

NexRide uses Redis for BullMQ email jobs, idempotency, caching, and short-lived
booking coordination. MongoDB transactions remain authoritative for bookings,
but Redis still needs authentication and persistence so restarts do not silently
discard queued work.

The supplied configuration targets Redis 7 or newer on the same Ubuntu VPS as
the API. It binds only to loopback. A single Redis process is restart-resilient,
not highly available: a VPS or disk failure still takes it offline. Use a
managed Redis service with replication and automatic failover if that outage
window is unacceptable.

## 1. Install and size Redis

Install a supported Redis package and stop the API before changing an existing
Redis persistence strategy:

```bash
sudo apt update
sudo apt install redis-server redis-tools
redis-server --version
```

`deploy/redis/redis.conf` sets `maxmemory 512mb`. Adjust that value before
installation for the actual VPS. Leave RAM for MongoDB, Node, the kernel, and
Redis background AOF/RDB work; Redis can temporarily use substantially more
memory while it forks for persistence. Keep `maxmemory-policy noeviction`:
evicting BullMQ or lock keys would lose work rather than produce an explicit
write failure.

## 2. Install the configuration and ACL

Generate a long password that contains no whitespace, then copy the templates:

```bash
openssl rand -base64 48
sudo install -o root -g redis -m 0640 deploy/redis/redis.conf /etc/redis/redis.conf
sudo install -o root -g redis -m 0640 deploy/redis/nexride.acl.example /etc/redis/nexride.acl
sudo editor /etc/redis/nexride.acl
sudo install -d -o root -g root -m 0755 /etc/systemd/system/redis-server.service.d
sudo install -o root -g root -m 0644 deploy/systemd/redis-server.service.d/override.conf /etc/systemd/system/redis-server.service.d/override.conf
```

Replace the ACL placeholder with the generated password. The ACL disables the
default user, restricts keys and Pub/Sub channels to `nexride:*`, and denies
administrative/destructive commands while retaining the commands BullMQ needs.
Do not put the real ACL file in Git.

For a fresh instance:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now redis-server
sudo systemctl restart redis-server
sudo systemctl status redis-server --no-pager
sudo ss -lntp | grep ':6379'
```

The listener output must show only `127.0.0.1:6379` and optionally `[::1]:6379`,
never `0.0.0.0` or a public address. Port 6379 must remain closed in UFW and the
hosting provider firewall.

### Existing Redis data

Do not enable AOF by only replacing the file and restarting an instance that
already contains data. First back up `dump.rdb`, enable AOF on the running
instance with its current administrator credentials, and wait until both
`aof_rewrite_in_progress` and `aof_rewrite_scheduled` are `0` and
`aof_last_bgrewrite_status` is `ok`. Then install the persistent configuration
and restart. This is the migration sequence required by Redis to avoid data
loss when converting an existing RDB-only instance.

## 3. Configure NexRide

Put the matching values in `/etc/nexride/backend.env`:

```dotenv
REDIS_ENABLED=true
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_USERNAME=nexride
REDIS_PASSWORD=the-generated-password
REDIS_PROBE_TIMEOUT_MS=1500
```

Then validate without printing the password:

```bash
cd /srv/nexride/backend
sudo -u nexride env PRODUCTION_ENV_FILE=/etc/nexride/backend.env npm run validate:production-env
sudo systemctl restart nexride
```

For a remote/managed service, remove the host, port, username, and password
variables and set one authenticated `REDIS_URL=rediss://user:password@host:port`
instead. URL-encode reserved characters in credentials. Production validation
rejects remote plaintext `redis://` URLs. Verify the provider certificate
against the normal system trust store; do not disable certificate validation.

## 4. Verify security and persistence

Run the non-destructive verification with the application ACL credentials:

```bash
cd /srv/nexride
sudo -u redis env \
  REDIS_USERNAME=nexride \
  REDISCLI_AUTH='the-generated-password' \
  deploy/redis/verify.sh
unset REDISCLI_AUTH
```

All checks must report `PASS`. Also confirm unauthenticated access is rejected:

```bash
env -u REDISCLI_AUTH redis-cli -h 127.0.0.1 PING
```

That command must return `NOAUTH Authentication required` rather than `PONG`.
Restart Redis once during the deployment window, rerun the verifier, and check
the API readiness endpoint before accepting the release:

```bash
sudo systemctl restart redis-server
sudo journalctl -u redis-server -n 100 --no-pager
curl --fail --silent https://your-domain.example/health/readiness
```

## 5. Operate and monitor

Monitor `used_memory`, `maxmemory`, `evicted_keys`, `rejected_connections`,
`aof_last_write_status`, `aof_last_bgrewrite_status`, disk space, and the
systemd restart count. Alert before memory or disk exhaustion. Any nonzero
`evicted_keys` is a configuration incident for this workload.

AOF and RDB make restarts durable; they are not an off-host backup or high
availability. The application can fall back to MongoDB for booking safety, but
email queue jobs can be delayed while Redis is unavailable. If those jobs must
survive total VPS loss, use managed Redis with replication, automatic failover,
TLS, and provider backups, and test that recovery process before launch.

