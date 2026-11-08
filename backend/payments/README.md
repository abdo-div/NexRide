# Portable Mastercard MPGS payment module

This folder is the application-independent Digital Group MPGS module. Copy the
entire `payments` directory into another Node.js ESM backend. It has no Express,
Mongoose, React, or NexRide imports and uses the built-in `fetch` API.

## Supported operations

- Mastercard Hosted Checkout session creation (`INITIATE_CHECKOUT`)
- server-to-server order retrieval and verification
- `PURCHASE` and `AUTHORIZE` checkout modes
- full and partial linked refunds
- Basic API authentication, timeout handling, safe URL construction
- normalized errors and payment outcomes
- exact decimal comparison without binary floating-point arithmetic

## Configuration

Copy `.env.example` into the consuming application's secret configuration. Do
not commit the API password. The gateway hostname and API version must be the
ones assigned to the merchant by its bank/payment service provider.

## Construction

```js
import {
  createMpgsConfig,
  MpgsClient,
  MpgsProvider,
} from "./payments/index.js";

const config = createMpgsConfig(process.env);
const client = new MpgsClient({ config });
const mpgs = new MpgsProvider({ client });
```

See `examples/basic-usage.js` for checkout creation. Store `orderId`,
`sessionId`, `successIndicator`, amount, currency, and operation in your own
database. Never accept amount or currency from the browser.

## Browser flow

Load `${MPGS_BASE_URL}/static/checkout/checkout.min.js`, then configure the
gateway with only the server-created session ID:

```js
Checkout.configure({ session: { id: checkout.sessionId } });
Checkout.showPaymentPage();
```

After MPGS returns the browser, call `verifyPayment()` on the server. A browser
`resultIndicator` is not proof of payment.

## Verification rule

A purchase succeeds only when all of these match the stored attempt:

- order ID
- amount and currency
- gateway result `SUCCESS`
- order status `CAPTURED`
- total captured amount

An authorization requires `AUTHORIZED` and the full authorized amount. Pending,
partial, mismatched, failed, and unknown results are never marked paid.

## Refund rule

Generate and durably store a new refund transaction ID before calling
`refundPayment()`. Reuse that same ID after a network timeout. Never create a
second ID merely because the first response was lost.

## What the consuming application must provide

- authentication and authorization
- database persistence and unique indexes
- idempotency and concurrency control
- business pricing and refund policy
- return/cancel pages
- reconciliation scheduling
- secret management and production monitoring

NexRide examples of these application adapters live outside this folder in
`services/mpgs.service.js` and `services/mpgsRefund.service.js`.
