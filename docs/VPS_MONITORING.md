# NexRide production monitoring and alerting

NexRide writes structured JSON application logs to stdout/stderr, which the
systemd service captures in journald. The supplied monitor checks the API,
supporting services, storage pressure, backup freshness, and public TLS every
minute. It sends a webhook on the first failure, hourly while a failure remains,
and once when service recovers.

This on-host monitor cannot report a total VPS, network, or provider outage.
The company hosting team must also configure an external HTTPS monitor from a
different network against `/health/liveness`; use `/health/readiness` for a
stricter dependency-aware alarm.

## 1. Configure durable logs

Review the global journal limits against the VPS disk size, then install the
drop-in:

```bash
sudo install -d -o root -g systemd-journal -m 2755 /var/log/journal
sudo install -o root -g root -m 0644 deploy/journald/99-nexride.conf /etc/systemd/journald.conf.d/99-nexride.conf
sudo systemctl restart systemd-journald
sudo journalctl --disk-usage
```

The template retains compressed logs for up to 30 days within a 1 GiB ceiling
while reserving 1 GiB of free disk. If the company already ships logs to its
hosting panel or SIEM, keep that agent and adjust local retention to the agreed
policy rather than installing conflicting limits.

Useful application event names are:

- `booking_created`;
- `payment_completed`, `payment_verification_rejected`, and
  `payment_verification_replayed`;
- `email_job_completed`, `email_job_failed`, `email_job_stalled`, and
  `email_worker_error`.

HTTP requests include a request ID, method, path without query strings, status,
and duration. Credentials, cookies, reset tokens, and payment secrets are not
logged. Example live view:

```bash
sudo journalctl -u nexride -f -o cat
sudo journalctl -u nexride --since today -p warning
```

Configure the hosting log search to alert on `level=error`,
`payment_verification_rejected`, and `email_job_failed`, and to chart HTTP 5xx
volume. The health timer detects outages; log alerts provide workflow detail.

## 2. Install the on-host monitor

Create a dedicated unprivileged account and secret configuration:

```bash
sudo useradd --system --home /var/lib/nexride-monitor --shell /usr/sbin/nologin nexride-monitor
sudo install -d -o root -g nexride-monitor -m 0750 /etc/nexride
sudo install -o root -g nexride-monitor -m 0640 deploy/monitoring/monitor.env.example /etc/nexride/monitor.env
sudo editor /etc/nexride/monitor.env
```

Set `PUBLIC_HOST` to the production hostname only. Set `ALERT_WEBHOOK_URL` to a
dedicated HTTPS webhook understood by the company's incident channel. The
webhook receives a small JSON object with a `text` property. Never paste the
webhook into shell history or commit it.

The default service names target the supplied single-VPS MongoDB and Redis
deployment. If either dependency is managed externally, remove its local
service from `MONITORED_SERVICES`; readiness still checks connectivity through
the API. Keep both backup units in `BACKUP_SERVICES` unless the corresponding
data has moved to a managed service with provider-native backup alarms.

Install and start the timer:

```bash
sudo install -o root -g root -m 0755 deploy/monitoring/check.sh /usr/local/sbin/nexride-monitor
sudo install -o root -g root -m 0644 deploy/systemd/nexride-monitor.service /etc/systemd/system/
sudo install -o root -g root -m 0644 deploy/systemd/nexride-monitor.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nexride-monitor.timer
sudo systemctl start nexride-monitor.service
sudo journalctl -u nexride-monitor.service -n 100 --no-pager
sudo systemctl list-timers nexride-monitor.timer
```

The first successful run establishes the `OK` baseline without sending noise.
A failing run exits nonzero and sends an alert. Alert delivery failure does not
advance monitor state, so the next timer run retries instead of silently
suppressing the incident.

## 3. Configure external monitoring

In the company hosting panel or independent uptime system, create checks from
outside this VPS:

1. `GET https://your-domain.example/health/liveness` every minute; alert after
   two consecutive failures.
2. `GET https://your-domain.example/health/readiness` every minute; alert the
   application owner if MongoDB or Redis is disconnected.
3. TLS certificate expiry warning at 14 days.
4. VPS CPU, memory, disk usage, inode usage, and host-unreachable alerts.
5. Notification delivery to at least two named responders or a staffed channel.

Test alerts before launch by using the hosting provider's test-notification
feature. During a maintenance window, stop a noncritical monitored service,
confirm that the on-host and external alerts arrive, restart it, and confirm the
recovery notification. Record the responders, escalation path, and expected
acknowledgement time.

## 4. Launch thresholds and response

Treat any readiness failure, repeated process restart, stale backup, disk usage
at 85%, TLS expiry within 14 days, or unexpected payment/email error spike as
actionable. The launch owner should have the release SHA, rollback procedure,
MongoDB restore runbook, file restore runbook, and hosting escalation contact
available before opening traffic to real users.
