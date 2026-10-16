# NexRide Node.js service on a VPS

NexRide ships with `deploy/systemd/nexride.service`. The unit keeps the API
running after a crash or reboot, validates production configuration before each
start, sends `SIGTERM` for graceful request draining, and writes structured
logs to the system journal.

The paths assume immutable releases under `/srv/nexride/releases` and an atomic
`/srv/nexride/current` symlink. Follow [`VPS_RELEASES.md`](./VPS_RELEASES.md).
Keep exactly one API process: it also runs the email worker and booking-expiry
scheduler.

## One-time installation

Run these commands as a sudo-capable deployment operator:

```bash
sudo useradd --system --home /srv/nexride --shell /usr/sbin/nologin nexride
sudo install -d -o root -g nexride -m 0750 /srv/nexride /srv/nexride/releases
sudo install -d -o nexride -g nexride -m 0750 /var/lib/nexride/public
sudo install -d -o nexride -g nexride -m 0750 /var/lib/nexride/private
sudo install -d -o root -g nexride -m 0750 /etc/nexride
sudo install -o root -g nexride -m 0640 backend/.env.production.example /etc/nexride/backend.env
```

Replace every placeholder in `/etc/nexride/backend.env`. Do not place the live
file in Git. Install Node.js 24 so `node` resolves to `/usr/bin/node`, then use
the first-release procedure in [`VPS_RELEASES.md`](./VPS_RELEASES.md). It installs
locked dependencies, validates this environment, installs the systemd unit, and
starts the service.

If deployment checkout ownership differs, the `nexride` user needs read access
to `/srv/nexride` and its built frontend, but source code should remain
read-only. `/var/lib/nexride/public` and `/var/lib/nexride/private` are the only
persistent application write paths in the supplied unit. Follow
[`VPS_STORAGE.md`](./VPS_STORAGE.md) to migrate existing uploads and configure
backups before the first release-directory deployment.

## Operate and verify

```bash
sudo systemctl status nexride --no-pager
sudo journalctl -u nexride -n 100 --no-pager
curl --fail http://127.0.0.1:3000/health/liveness
curl --fail http://127.0.0.1:3000/health/readiness
```

The liveness endpoint proves the Node process responds. Readiness must also be
HTTP 200 before Nginx receives public traffic; it verifies MongoDB and the
enabled Redis connection.

## Deploy an update

Use the checksummed CI artifact and atomic deploy/rollback process in
[`VPS_RELEASES.md`](./VPS_RELEASES.md). Do not update a live checkout in place.
Do not use `node server.js`, `npm start`, `nohup`, or a terminal session as the
production supervisor.
