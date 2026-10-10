# Security Audit – Remediation Summary

Status: **Resolved** — full backend test suite green (`npm test`).

The findings below were classified as P1 (priority-1: direct exploitation path or
hard-guarantee violation) and remediated during this engagement. Each entry lists
the vulnerability, the fix, the files touched, and the regression coverage.

---

## P1-1 — Race condition / double booking during concurrent checkout

- **Vulnerability:** Two concurrent checkouts of the same vehicle could both pass
  the "is it free?" read and create overlapping bookings (double booking), and a
  transient MongoDB `WriteConflict` bubbled up as an unhandled 500.
- **Fix:**
  - Booking creation runs inside a Mongoose **transaction** (`startSession().withTransaction`).
  - An **atomic vehicle claim mutex** (`findOneAndUpdate` guarded state flip) makes
    the availability check a single atomic compare-and-set; the loser receives a
    clean `409 Conflict` instead of racing through.
  - The in-session overlap check is scoped to the requested window with the
    DB-side overlap filter.
  - A stale `PENDING_PAYMENT` reservation is expired by the reaper
    (`RESERVATION_EXPIRY_MINUTES`, clamped to a sane minimum), so paid bookings
    can never be handed out twice.
- **Files:** `backend/services/bookingService.js`, `backend/controllers/bookingController.js`.
- **Tests:** `backend/tests/bookingConcurrency.test.js`, `backend/tests/bookingCollision.test.js`,
  `backend/tests/bookingExpiry.test.js`.

## P1-2 — Cancellation refund policy + maintenance state locking

- **Vulnerability:** Cancellations did not honor the time-based refund policy and
  could free a vehicle that was simultaneously locked for maintenance, so revenue
  was kept incorrectly and maintenance/booking states could conflict.
- **Fix:**
  - **Refunds:** cancellation refunds follow the 48h / 24h policy
    (100% → `REFUNDED`, 50% → `PARTIALLY_REFUNDED`, <24h → booking stays `PAID`).
    Never-paid pending bookings retire their ledger row; payout summaries scale kept
    revenue by the refunded portion and never pay out a fully refunded row.
  - **Maintenance locking:** a vehicle quarantined for maintenance can never be
    unlocked by cancellation; maintenance scheduling is rejected while a paid
    booking overlaps the window (`PENDING_PAYMENT` bookings are auto-cancelled);
    public availability respects the maintenance lock; completing one event keeps
    the unit locked while another is still open.
- **Files:** `backend/services/payoutService.js`, `backend/services/maintenanceService.js`,
  `backend/services/bookingService.js`.
- **Tests:** `backend/tests/maintenanceRefund.test.js`, `backend/tests/adminMaintenance.test.js`,
  `backend/tests/adminPayout.test.js`.

## P1-3 — JWT & authorization header logging redaction

- **Vulnerability:** Authentication material (`Authorization`, `Cookie`) could leak
  into HTTP request logs (`pino`/morgan) and application payload logs.
- **Fix:**
  - Shared logger redaction config censors every credential header path
    (`Authorization`, `Cookie`, password/token payload fields) with the censor
    marker; `Set-Cookie` response headers are redacted too.
  - The development morgan format logs **no query string**, and the production
    request serializer exposes only safe operational metadata with no credentials.
- **Files:** `backend/utils/logger.js` (via redact config),
  `backend/utils/email.js`, `backend/utils/securePagination` uses any fields it
  logs are scrubbed, request serializer in the app bootstrap.
- **Tests:** `backend/tests/loggerRedaction.test.js`.

## P1-4 — Multi-tenant database query scoping (companyId injection)

- **Vulnerability:** Company-scoped endpoints trusted caller-supplied
  `?companyId=` / `body.companyId`, and some service writes had **no** tenant
  filter — a rogue company account could read/write another tenant's vehicles,
  bookings, payments, fairness availability, and the payout ledger
  (a `{ companyId: undefined }` filter let a tenant-less account see every
  tenant's rows).
- **Fix:**
  - Tenant context is resolved **server-side only** (`req.tenantId`, set by
    `protect` from `req.user.company`) and is never sourced from query/body
    parameters for company accounts. Admin may still scope via query/body.
  - All tenant-level service writes (`updateVehicleRecord`,
    `updateVehicleStatusById`, `softDeleteVehicleById`) now build
    `{ _id, companyId }` filters via `findOneAndUpdate`; a scoped write that hits
    no tenant-owned row resolves to `404`, and a company account without a
    resolvable tenant **fails closed** (`403`) instead of running an unscoped query
    (`fetchAllPayments`, `getCompanyReviews`, `getCompanyPayoutSummary`).
  - Caller keys are stripped from validation (`updateVehicleSchema` drops
    `companyId`); customer review creation derives `customerId`/`companyId` from
    the verified completed booking and session, never from the request body.
- **Files:** `backend/services/vehicleService.js`, `backend/services/paymentService.js`,
  `backend/controllers/vehicleController.js`, `backend/controllers/bookingController.js`,
  `backend/controllers/paymentController.js`, `backend/controllers/reviewController.js`,
  `backend/validations/review.validation.js` (`companyId` denied from payload).
- **Tests:** `backend/tests/tenantIsolation.test.js`, `backend/tests/securityIdorTenant.test.js`.

## P1-5 — Route middleware chain ordering & fail-closed RBAC gates

- **Vulnerability:** RBAC/tenant gates were not consistently ordered
  (`validate` → `verifyTenantAccess` → controller), and some routes lacked param
  validation or ran lookups before proving authorization, enabling bypasses and
  malformed-id `500`s.
- **Fix:**
  - Canonical chain enforced: `protect` (global, mounted ahead of tenant logic on
    every router) → `restrictTo(role)` → `verifyTenantAccess` (server-side tenant
    resolution, fails closed `403`, admin bypass) → `validate` → controller.
  - `verifyTenantAccess` answers before any controller/DB lookup: non-admin
    without a tenant → `403`; a missing resource reports `404`, never `403`-first
    data disclosure.
  - Param validation (`idParamSchema`) added to booking by-id routes and mounted
    **before** the tenant gate so a malformed id returns `400` without a DB hit.
- **Files:** `backend/routes/bookingRoutes.js`, `backend/middlewares/authMiddleware.js`
  (reference behavior verified), `backend/middlewares/validate.middleware.js`.
- **Tests:** `backend/tests/tenantRbac.test.js` (chain ordering, RBAC-before-lookup,
  gate-before-controller, validate-before-gate).

## P1-6 — Manual cash collection settlement endpoint

- **Vulnerability:** `PATCH /api/v1/payments/:id/collect-cash` needed atomic
  create/collect semantics, a settlement auditor + timestamp, and proof of
  collection permission before any payment state was revealed.
- **Fix:**
  - Collect is a confirmed-owner or admin action (`assertCashCollectionAccess`
    proves ownership and refuses customers/anonymous callers); the ledger entry is
    created pending and atomically flipped to collected; double collection is
    prevented under concurrency; cash is refused on cancelled or refunded
    bookings so revenue is never booked for a trip that did not happen.
  - Ownership proof runs before the payment is read (no existence leak).
- **Files:** `backend/services/paymentService.js`, `backend/controllers/paymentController.js`,
  `backend/routes/paymentRoutes.js`.
- **Tests:** `backend/tests/bookingCashCheckout.test.js`.

## P1-7 — Host header poisoning prevention (FRONTEND_URL strictly enforced)

- **Vulnerability:** `forgotPassword`/`signup` emails built reset links from the
  request `Host`/`X-Forwarded-Host` header, letting an attacker redirect password
  reset tokens to their own origin.
- **Fix:**
  - `FRONTEND_URL` is the **only** source for reset/welcome email links.
  - It is **required in staging/production**: the server refuses to boot without it
    in non-development modes (no Host-header fallback path).
  - `FRONTEND_URL` is validated (must be `http(s)://`, non-http values rejected),
    normalized (trailing slashes/whitespace), and the local/development fallback is
    a loopback address, never a request-provided host.
- **Files:** `backend/utils/email.js`, backend bootstrap validation, `backend/.env.example`.
- **Tests:** `backend/tests/authService.test.js` (P1-7 suite).

## P1-8 — Fragile NODE_ENV control logic (isDevelopment fail-closed gating)

- **Vulnerability:** Environment postures used permissive string matches, so a typo
  (e.g. `prod_typo`), an unset variable, or a padded value could flip security
  controls (stack traces, rate limiter status, error verbosity) to development
  behavior in production.
- **Fix:**
  - `getNodeEnv` trims and reports single canonical values; `isDevelopment` /
    `isProduction` match **only** exact values.
  - `validateNodeEnv` rejects missing or unrecognised `NODE_ENV` values at boot.
  - `errorMiddleware` hides stack traces in every non-development posture
    (production, staging, unknown, unset, test); rate limiters stay active outside
    development. `JWT_SECRET` is validated at boot (rejects <32-byte secrets).
- **Files:** `backend/utils/envUtils.js` (`getNodeEnv`, `isDevelopment`,
  `isProduction`, `validateNodeEnv`), `backend/middlewares/errorMiddleware.js`,
  `backend/middlewares/rateLimiter.js` gating.
- **Tests:** `backend/tests/middleware.test.js` (P1-8 suite),
  `backend/tests/jwtSecret.test.js`.

---

## Test coverage summary

| Suite | Status |
| --- | --- |
| `authService.test.js` (P1-7) | Pass |
| `middleware.test.js` (P1-8) | Pass |
| `loggerRedaction.test.js` (P1-3) | Pass |
| `bookingCashCheckout.test.js` (P1-6) | Pass |
| `bookingConcurrency.test.js` (P1-1) | Pass |
| `bookingCollision.test.js` / `bookingExpiry.test.js` (P1-1) | Pass |
| `maintenanceRefund.test.js` (P1-2) | Pass |
| `tenantIsolation.test.js` (P1-4) | Pass |
| `tenantRbac.test.js` (P1-5) | Pass |
| `securityIdorTenant.test.js` (P1-4/P1-5) | Pass |
| Full suite (`npm test`) | **297 / 297 pass, 0 fail** |

> Note: the logger-security coverage requested earlier as `securityLogger.test.js`
> is delivered under `loggerRedaction.test.js`.

## Environment & configuration

`backend/.env.example` documents every security-relevant variable:

- `NODE_ENV` — enumerated (`development | test | staging | production`); anything
  else stops the boot; security posture is fail-closed outside exactly
  `development`.
- `FRONTEND_URL` — **required outside development**; the only source of
  password-reset/welcome email origins (P1-7).
- `JWT_SECRET` — validated at boot (min 32 bytes).
- Cookies: the app has no server-side session store; the JWT is carried in the
  cookie and its integrity is the JWT signature itself, so no `COOKIE_SECRET`
  exists by design — documented in `.env.example` to prevent a dead-config
  hunt. Redis (`REDIS_URL`), replica-set MongoDB, and Moamalat variables are
  also documented with security usage notes.