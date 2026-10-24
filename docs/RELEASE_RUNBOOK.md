# NexRide release runbook

Use this procedure for every production release. It complements
`PRODUCTION_SIGN_OFF.md`: the runbook defines the order of operations, while a
copied sign-off record stores the evidence and the final decision.

## 1. Freeze one immutable candidate

- Stop feature merges and select one full 40-character Git commit SHA.
- Confirm the branch is clean and CI is green for that exact SHA.
- Download only the CI artifact named `nexride-<sha>`; never rebuild it on the
  server or substitute files after CI.
- Record the CI URL, SHA, archive name, and published SHA-256 checksum in the
  release sign-off record.
- Confirm the previous known-good SHA is still installed before deployment.

No release proceeds while a backend test, frontend typecheck, lint, test, build,
or integration journey is failing.

## 2. Verify and deploy the artifact

Transfer the archive, checksum, `deploy.sh`, and `rollback.sh` from the same CI
artifact to a root-only staging directory on the VPS. Then run:

```bash
sudo sh ./deploy.sh nexride-<full-sha>.tar.gz nexride-<full-sha>.tar.gz.sha256
```

The deployer verifies the checksum and archive layout, installs dependencies as
the application user, validates the production environment, atomically changes
the `current` symlink, and waits for readiness. If the candidate is unhealthy,
it restores the previous release and verifies that release's readiness before
reporting recovery.

## 3. Certify the deployed SHA

Run the host verifier from the immutable deployed release:

```bash
sudo sh /srv/nexride/current/deploy/release/verify-host.sh <full-sha> https://your-domain.example \
  | tee nexride-host-verification.txt
```

From a trusted operator machine, run the authenticated production smoke suite
with dedicated release-test customer, approved-company, and admin accounts:

```bash
cd backend
SMOKE_BASE_URL=https://your-domain.example npm run smoke:production
```

Supply smoke credentials through the operator's protected environment, not the
command line, shell history, evidence file, or repository. A release is blocked
if host verification or any required smoke row is not `PASS`.

## 4. Complete human acceptance

Two people test the exact deployed SHA and attach redacted evidence to the copied
sign-off record:

- Customer: signup, search, checkout, one real low-value payment, confirmation,
  cancellation, refund, review, and password reset.
- Company: application/approval, vehicle publication, handover lifecycle, cash
  collection, maintenance, settings, earnings, and payout ledger.
- Admin: companies, customers, fleet, bookings, payments, maintenance,
  commissions, reports, payouts, and settings.
- Experience: English and Arabic, RTL, keyboard-only navigation, mobile and
  desktop layouts, and current Chrome, Edge, Firefox, and Safari.
- Operations: database and file restore evidence, alert/recovery delivery,
  external uptime/TLS monitoring, and staffed emergency contacts.

The release owner and operations owner must both record `GO` for the same full
SHA. `PENDING`, `SKIPPED`, an accepted test failure, or one missing owner is an
automatic `NO-GO`.

## 5. Observe the launch

For at least the first hour, the named primary and backup responders watch
readiness, 5xx responses, booking conflicts, payment verification, email queue
failures, resource headroom, and the first real booking. Keep the previous
release installed throughout this observation window.

Rollback immediately for sustained readiness or 5xx failures, duplicate
bookings, payment/ledger mismatch, corrupted uploads, or a critical security
regression:

```bash
sudo sh /srv/nexride/current/deploy/release/rollback.sh <previous-full-sha>
```

The rollback command is successful only after the selected release passes
readiness. If it cannot recover, remove the service from public traffic, retain
logs and artifacts, and begin the incident procedure; do not continue launch
traffic on an unverified process restart.

## 6. Close the release

- Attach CI, checksum, deployment, host verification, smoke, restore, payment,
  refund, RTL/mobile, and monitoring evidence to the sign-off record.
- Record the deployment and decision timestamps in UTC.
- Record incidents and accepted risks explicitly; required failed gates cannot
  be waived silently.
- Close the launch only after the observation owner confirms the first real
  booking and payment ledger are consistent.
