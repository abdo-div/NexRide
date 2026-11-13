# PayFlow payment aggregator integration

NexRide creates card payments through PayFlow and never sends MPGS or Moamalat
credentials to its browser or backend payment flow. Customers are redirected to
the PayFlow hosted checkout, where they choose an available provider.

## Local ports

- PayFlow API: `http://localhost:3000`
- PayFlow portal: `http://localhost:5173`
- NexRide API: `http://localhost:4000`
- NexRide frontend: its configured Vite URL

Set `PORT=4000` for NexRide when both applications run locally.

## NexRide environment

```env
PORT=4000
PAYMENT_AGGREGATOR_URL=http://localhost:3000
PAYMENT_AGGREGATOR_API_KEY=pk_test_replace_me
PAYMENT_AGGREGATOR_WEBHOOK_SECRET=whsec_replace_me
```

Create the API key in PayFlow's **API keys** page. Never expose it through a
`VITE_` variable or commit it to source control.

## Webhook endpoint

After NexRide is running on port 4000, register this endpoint in PayFlow:

```text
http://localhost:4000/api/v1/payments/aggregator/webhook
```

Subscribe to `payment.succeeded`, `payment.failed`, `payment.cancelled`,
`payment.expired`, and `payment.unknown`. Copy the signing secret into
`PAYMENT_AGGREGATOR_WEBHOOK_SECRET` and restart NexRide.

The receiver verifies the HMAC signature against the exact raw request body,
rejects timestamps older than five minutes, and records processed event IDs so
retries are idempotent. Only a signed `payment.succeeded` event marks the local
payment and booking paid.

## Customer flow

1. NexRide calls `POST /api/v1/payments/aggregator/init` for the booking.
2. NexRide's backend creates the PayFlow payment using its server-side API key.
3. The browser redirects to the returned PayFlow checkout URL.
4. PayFlow initializes and verifies MPGS or Moamalat.
5. PayFlow sends the signed final-status webhook to NexRide.
6. NexRide updates its MongoDB payment ledger and booking atomically.
