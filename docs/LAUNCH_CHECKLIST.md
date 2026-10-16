# NexRide Production Launch Checklist

This checklist is the release gate. A launch is approved only when every required item is checked against the exact commit and environment being deployed.

## 1. Freeze and identify the release

- [ ] Commit all intended source changes; working tree is clean.
- [ ] Record the release commit SHA and tag it.
- [ ] `npm ci && npm run lint && npm test && npm run build` passes in `frontend`.
- [ ] `npm ci && npm test` passes in `backend`.
- [ ] Production secrets are stored in the hosting provider, never in Git.
- [ ] `npm run validate:production-env` passes in `backend` using the exact VPS environment.

## 2. Infrastructure

- [ ] `NODE_ENV=production`.
- [ ] The supplied `nexride.service` is installed, enabled, and running as the dedicated `nexride` user on Node.js 24.
- [ ] `systemctl restart nexride` completes cleanly and `journalctl -u nexride` shows no forced-shutdown or restart loop.
- [ ] MongoDB is an authenticated replica set bound only to a trusted interface; `db.hello()` reports a writable primary.
- [ ] The nightly MongoDB backup timer succeeded, its encrypted off-host copy exists, and an isolated restore drill passed.
- [ ] Redis is reachable over TLS where supported and configured for persistence/availability.
- [ ] `JWT_SECRET` is unique, random, and at least 32 bytes.
- [ ] `FRONTEND_URL` and `FRONTEND_DOMAIN` exactly match the public HTTPS origin.
- [ ] DNS and TLS certificate are valid; HTTP redirects to HTTPS.
- [ ] Nginx proxies to `127.0.0.1:3000`; Node, MongoDB, and Redis are not publicly reachable.
- [ ] UFW and any provider firewall expose only the confirmed SSH port plus TCP 80/443.
- [ ] `certbot renew --dry-run` succeeds and automatic renewal is enabled.
- [ ] `npm run sync-indexes` reports a reviewed plan, then `npm run sync-indexes -- --apply` succeeds after a current backup.
- [ ] `/health/liveness` returns 200.
- [ ] `/health/readiness` returns 200 with database and cache connected.

## 3. External services

- [ ] Moamalat is in the intended environment and merchant credentials were verified out-of-band.
- [ ] One low-value real payment completes and appears once in the ledger.
- [ ] One real refund follows the documented cancellation policy.
- [ ] SMTP sends signup/admin notification/password-reset email and links use the public domain.
- [ ] Uploaded company, user, and vehicle images survive a redeploy (persistent/object storage).

## 4. Golden-path acceptance

- [ ] Customer: signup → search → vehicle → checkout → payment → confirmation → booking details.
- [ ] Customer: cancellation/refund and completed-trip review.
- [ ] Company: application → admin approval → login → add/publish vehicle.
- [ ] Company: booking handover → active → completed; cash collection; maintenance lock/release.
- [ ] Company: messages, reviews, settings, earnings and payout ledger.
- [ ] Admin: approve/suspend company, inspect customers/fleet/bookings/payments.
- [ ] Admin: maintenance, commission, reports, payout, and platform settings workflows.
- [ ] Arabic and English tested on desktop and mobile; no clipped RTL controls.

## 5. Automated post-deploy smoke test

Run from `backend`:

```powershell
$env:SMOKE_BASE_URL="https://your-domain.example"
$env:SMOKE_CUSTOMER_EMAIL="release-customer@example.com"
$env:SMOKE_CUSTOMER_PASSWORD="..."
$env:SMOKE_COMPANY_EMAIL="release-company@example.com"
$env:SMOKE_COMPANY_PASSWORD="..."
$env:SMOKE_ADMIN_EMAIL="release-admin@example.com"
$env:SMOKE_ADMIN_PASSWORD="..."
npm run smoke:production
```

Never commit these credentials. All checks must report `PASS`; `SKIPPED` role checks mean the release is not fully certified.

## 6. Operations and rollback

- [ ] Error logs and uptime alerts are visible to the launch owner.
- [ ] A named person monitors bookings, payment callbacks, email failures, and Redis/Mongo health.
- [ ] Previous deploy artifact and database restore instructions are available.
- [ ] Rollback trigger is agreed: elevated 5xx rate, payment mismatch, duplicate booking, or readiness failure.
- [ ] Emergency contact details shown on the site are real and staffed.
- [ ] After launch, re-run smoke tests and verify the first real customer booking end-to-end.
