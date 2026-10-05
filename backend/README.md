# NexRide backend

The NexRide backend is an Express API for the vehicle-rental marketplace and its operations dashboard. It provides authentication, vehicle and company management, bookings, payments, maintenance, payout and reporting workflows. It also serves the legacy Pug views and static files in `backend/views` and `backend/public`.

## Stack

- Node.js 24 and Express 5
- MongoDB with Mongoose
- Redis with ioredis and BullMQ for cache, idempotency, reservation coordination, and queued email
- JWT authentication, role-based authorization, request validation with Zod
- Moamalat payment gateway and optional Stripe webhook integration

## Prerequisites

- Node.js 24 and npm
- A MongoDB deployment configured as a replica set. Booking and payment operations use MongoDB transactions.
- Redis for full application functionality, including Redis-backed reservation/idempotency behavior and email queues.

The server can start when MongoDB or Redis is unavailable, but it runs in a degraded state; readiness reports `503` until both are available. Local defaults target MongoDB at `mongodb://127.0.0.1:27017/nexride?replicaSet=rs0` and Redis at `127.0.0.1:6379`.

## Install and configure

From the repository root:

```powershell
Set-Location backend
npm ci
Copy-Item .env.example .env
```

Edit `backend/.env` for your local services and integrations. Do not commit `.env` or put credentials in source control. The server loads environment files in this order: `backend/config.env` (legacy), `backend/.env`, then the repository-root `.env`; it uses the first file that exists. Variables already supplied by the shell are retained.

### Environment variables

The full list of supported names and secret placeholders is in [`.env.example`](./.env.example). Key configuration:

| Variable(s) | Purpose |
| --- | --- |
| `JWT_SECRET` | Secret used to sign and verify session tokens. Set a strong private value for every non-test environment; the code has an insecure development fallback. |
| `MONGODB_URI` | MongoDB connection URI. Alternatives supported by the code are `MONGO_URI`, `DATABASE_URI`, `DATABASE_URL`, and `DATABASE`. If none is set, the local replica-set URI above is used. |
| `REDIS_URL` | Redis connection URI. Without it, configure `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`; defaults are `127.0.0.1:6379`. Other URL aliases are read by the code, but use `REDIS_URL` for URI-based deployments. |
| `PORT`, `NODE_ENV` | HTTP port and runtime mode. `PORT` defaults to `3000`; set `NODE_ENV` to `development` or `production` as appropriate. |
| `DNS_SERVERS` | Optional comma-separated IP addresses used to override Node DNS resolution when the host resolver cannot resolve MongoDB Atlas/SRV records. For example, `DNS_SERVERS=8.8.8.8,1.1.1.1`. Omit it to use the host/system resolver. |
| `FRONTEND_DOMAIN` | Optional comma-separated exact origins allowed by CORS. Development defaults include `http://localhost:5173` and `http://localhost:5174`; configure deployment origins explicitly, for example `FRONTEND_DOMAIN=https://app.example.com,https://admin.example.com`. |
| `FRONTEND_URL`, `CLIENT_URL` | Frontend URL used in auth links and client URL used in booking emails, respectively. |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`, `EMAIL_FROM`, `EMAIL_FROM_NAME` | Local/development SMTP and sender configuration. Development defaults to a local SMTP server at `127.0.0.1:1025`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USERNAME`, `SMTP_PASSWORD` | Production SMTP configuration. |
| `MOAMALAT_ENV`, `MOAMALAT_MID`, `MOAMALAT_TID`, `MOAMALAT_SECURE_KEY` | Optional Moamalat environment and merchant credentials. Payment initiation requires the merchant ID, terminal ID, and signing key. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Optional Stripe payment/webhook integration credentials. |
| `JWT_EXPIRES_IN`, `JWT_COOKIE_EXPIRES_IN` | Token and cookie expiration configuration. |
| `REDIS_PROBE_TIMEOUT_MS`, `LOG_LEVEL`, `SENTRY_DSN` | Optional Redis probe timeout and logging level. `SENTRY_DSN` is read by the Sentry config module, but startup does not currently initialize Sentry. |

All payment, mail, and monitoring credentials are optional for features that do not use those integrations. Never place real credentials in the example file.

## Run locally

```powershell
npm run dev
```

This starts the API with Nodemon at `http://localhost:3000` by default. `npm start` runs `node server.js`; there is no backend build step or separate production-build script.

Useful endpoints:

- `GET /health/liveness` — process liveness
- `GET /health/readiness` — MongoDB and Redis readiness
- `/api-docs` — Swagger UI

The API is mounted primarily under `/api/v1` (users, vehicles/cars, companies, bookings, payments, reviews, and admin). Moamalat gateway configuration is exposed under `/api/v1/payments/moamalat/config`; customer payment creation/initiation requires authentication, and verification is performed server-side against the gateway and stored booking data.

## Authentication and access

Signup and login return a JWT and set an HTTP-only cookie. API clients can also send the token as a Bearer token. User status is checked on authenticated requests, and role-based middleware restricts administrative operations to admins. Company users must belong to an approved company; tenant-scoped payment and company operations are restricted to that company.

## Tests

```powershell
npm test
```

This runs the existing Node.js test suite using the built-in `node:test` runner. Tests mock external service/database boundaries where needed and do not require live payment gateways.

## Main areas

- `routes/` and `controllers/` — API/view routing and request handling
- `services/` — authentication, booking, payment, analytics, payout, maintenance, and settings workflows
- `models/` — MongoDB/Mongoose data models
- `middlewares/` and `validations/` — authentication, tenant checks, security, pagination, and request validation
- `queues/` — queued email worker and producer
- `views/` and `public/` — legacy Pug interface and static assets
