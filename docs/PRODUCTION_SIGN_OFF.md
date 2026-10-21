# NexRide production go/no-go record

Follow [`RELEASE_RUNBOOK.md`](./RELEASE_RUNBOOK.md) in order. This document is
the evidence record; it does not replace the deployment and recovery procedure.

Copy this file for each release and name it with the release date and full Git
SHA. Store the completed record in the company's controlled operations system;
do not commit credentials, customer data, payment data, or secret-bearing logs.

**A release is GO only when every required row is PASS and the named release
owner and operations owner both approve the same SHA.** A CI pass alone does not
mean the live service is production-ready.

## Release identity

| Field | Evidence |
| --- | --- |
| Full 40-character Git SHA | |
| Release tag | |
| CI run URL | |
| Artifact checksum | |
| Deployment timestamp (UTC) | |
| Public HTTPS origin | |
| Previous known-good SHA | |

## Automated gates

| Required gate | Status | Evidence or timestamp |
| --- | --- | --- |
| Backend CI tests pass | PENDING | |
| Frontend typecheck, lint, tests, and build pass | PENDING | |
| Release artifact checksum verified during deployment | PENDING | |
| Production environment preflight passes | PENDING | |
| `verify-host.sh` passes for the exact SHA and origin | PENDING | |
| Authenticated customer/company/admin smoke test reports only PASS | PENDING | |

Run the host verifier on the VPS after deployment:

```bash
sudo sh /srv/nexride/current/deploy/release/verify-host.sh <full-sha> https://your-domain.example | tee nexride-host-verification.txt
```

Run `npm run smoke:production` from a trusted operator machine using dedicated
release-test customer, approved company, and admin accounts. Keep the credentials
out of shell history and Git. Attach the redacted output to this record.

## Infrastructure and recovery evidence

| Required gate | Status | Evidence or timestamp |
| --- | --- | --- |
| Provider firewall and UFW expose only approved SSH plus 80/443 | PENDING | |
| MongoDB authenticated replica-set primary confirmed | PENDING | |
| Redis ACL, persistence, memory headroom, and no-eviction checks pass | PENDING | |
| Latest database backup copied off-host and isolated restore drill passes | PENDING | |
| Latest file backup copied off-host and isolated verification passes | PENDING | |
| Test alert and recovery reach the incident channel | PENDING | |
| External uptime/TLS monitor is active | PENDING | |
| Rollback to the previous artifact has been rehearsed | PENDING | |

## Human acceptance evidence

| Required workflow | Status | Tester and evidence |
| --- | --- | --- |
| Customer signup, search, checkout, real low-value payment, confirmation | PENDING | |
| Customer cancellation, real refund, completed-trip review | PENDING | |
| Company application, approval, login, vehicle publication | PENDING | |
| Company handover, active, completed, cash collection, maintenance | PENDING | |
| Company messages, reviews, settings, earnings, payout ledger | PENDING | |
| Admin company/customer/fleet/booking/payment operations | PENDING | |
| Admin maintenance, commission, reports, payout, settings | PENDING | |
| Signup, notification, and password-reset emails use public links | PENDING | |
| English and Arabic desktop/mobile checks, including RTL | PENDING | |
| Emergency contact details are real and staffed | PENDING | |

## Launch decision

Rollback immediately for a sustained elevated 5xx rate, readiness failure,
payment mismatch, or duplicate booking. Record any accepted risk explicitly;
never silently convert a failed required gate into PASS.

| Approval | Name | Decision | Timestamp (UTC) |
| --- | --- | --- | --- |
| Release owner | | GO / NO-GO | |
| Operations owner | | GO / NO-GO | |

Named primary responder: ____________________

Named backup responder: _____________________

Post-launch owner for the first real booking: ____________________
