# NexRide release deployment and rollback

Each successful CI push produces a checksummed artifact named for the exact
40-character Git commit SHA. A release contains committed backend/deployment
files and the frontend output built by CI; it never contains the VPS environment
file. The VPS layout is:

```text
/srv/nexride/
  current -> releases/<commit-sha>
  releases/<commit-sha>/
/etc/nexride/backend.env
/var/lib/nexride/{public,private}/
```

## One-time setup

Install Node.js 24, create the `nexride` user and persistent storage as described
in the other VPS guides, then create the release root:

```bash
sudo install -d -o root -g nexride -m 0750 /srv/nexride /srv/nexride/releases
```

The deployment script installs and enables `nexride.service` after it creates the
`current` link, so this process also handles the first release.

## Deploy a CI artifact

Download the CI artifact bundle to a temporary operator-owned directory. It
contains the release archive, checksum, and deployment scripts. Do not unpack or
edit the inner `.tar.gz`. Review the exact commit and ensure database and file
backups are current, then run:

```bash
sudo sh deploy.sh nexride-<sha>.tar.gz nexride-<sha>.tar.gz.sha256
```

The script verifies the checksum and archive paths, installs locked production
dependencies as `nexride`, validates `/etc/nexride/backend.env`, atomically moves
the `current` link, installs the versioned systemd unit, and waits for readiness.
If readiness fails, it restores the old link and restarts the old release
automatically. The failed release remains available for investigation.

After a successful switch, run the public smoke test from a trusted operator
machine with all three role credentials. Missing credentials fail certification
by default. Set `SMOKE_REQUIRE_AUTH=false` only for a deliberately partial test;
that result cannot approve a launch.

## Explicit rollback

List installed releases and choose a known-good full SHA. Never roll application
code back across an incompatible database change without following that change's
database restore procedure.

```bash
sudo sh /srv/nexride/current/deploy/release/rollback.sh <full-40-character-sha>
```

The rollback validates the target configuration, switches atomically, and checks
readiness. If the target is unhealthy, it restores the release that was active
when rollback began. Trigger rollback for sustained elevated 5xx responses,
readiness failure, a payment mismatch, or a duplicate-booking incident.
