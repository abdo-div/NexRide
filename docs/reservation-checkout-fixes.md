# Reservation checkout fixes

Checkout now validates and persists primary driver contact details and the customer's eligibility declaration. This declaration is not document verification. Pickup and return times are converted from Libya local time into explicit ISO instants before availability checks and booking creation. Price calculations use rounded-up elapsed days throughout.

Payment retries in the same checkout reuse the created booking. Authenticated booking transactions persist a customer-scoped idempotency key and payload fingerprint, so a lost-response retry recovers the same booking and cash ledger even without Redis. Changing a reservation while reusing its key is rejected. The pre-authentication Redis response cache has been removed from booking routes. Saved bookings can also be paid from My Bookings. Date formatting on the payment page accepts persisted ISO timestamps, and lazy routes have a recoverable render-error boundary.

The vehicle detail quote includes the municipal/platform fee. The hardcoded two-day minimum is removed because there is no corresponding operator/backend policy. Optional extras start unselected. Confirmation lists saved extras and fees, displays the saved driver's identity, and reflects unpaid status without inventing passport verification, message delivery, card escrow or airport dispatch. Any deposit is confirmed by the operator at pickup.

## Validation

- Frontend: `npm test` (14 tests), `npm run lint`, `npm run build`.
- Full backend suite: 463 passed, zero failed, with the opt-in real API test skipped. This includes all ten payment-index tests against an isolated MongoDB replica set.
- Opt-in real API regression plus checkout identity tests: 12 passed, zero failed. Covers validation, elapsed-day/add-on/fee pricing, ignored client totals, lost-response recovery without Redis, customer isolation, exact date boundaries, cancellation, simultaneous retries, double-booking rejection, operator cash collection, duplicate collection rejection and full-refund ledger recording.
- Local browser with an isolated API fixture: empty-driver and eligibility rejection; failure and retry create only one booking; resume payment renders; Change Dates retains choices; cash confirmation retains 2 PM and the itemized fee.
- API tests use the real Express backend and isolated MongoDB. Gateway success and actual refund transfers remain unverified; a local ledger refund does not demonstrate a provider transfer.

To rerun API regression, seed an isolated QA backend and set `TEST_API_BASE_URL`, `TEST_QA_EMAIL`, `TEST_OPERATOR_EMAIL`, and `TEST_QA_PASSWORD`, then run `node --test tests/reservationApi.test.js`. Do not point it at production: it creates test accounts, bookings and cash/refund ledger entries.

## Deployment and open gateway issue

Deploy backend and frontend together: new customer booking requests require `primaryDriver`, positive eligibility and explicit ISO timestamps. Existing saved bookings remain readable and payable; their missing driver snapshot falls back to the account name. Do not reinterpret legacy date-only reservations as selected pickup times; those choices were never stored.

Before serving the new backend, create the additive checkout uniqueness index in the application's MongoDB database (legacy bookings without keys are excluded):

```javascript
db.bookings.createIndex(
  { customerId: 1, checkoutKey: 1 },
  { unique: true, partialFilterExpression: { checkoutKey: { $type: "string" } } }
)
```

The key remains attached to its booking, including after cancellation/expiry; a fresh reservation must use a new key. This avoids an old delayed request recreating a cancelled rental.

Both supplied sandbox cards failed with Moamalat `Order not found / Response: 61` before these changes. Its cause is not established. Signing still uses the documented canonical amount/timestamp/merchant/terminal fields and server-side HMAC. This change trims deployment credentials and rejects malformed hex keys but does not claim to solve every gateway configuration error.

Run `npm run diagnose:moamalat` from the backend directory on Render. Its output excludes credential values and card data. Check the selected environment, configured flags, valid hex key, gateway endpoints, Libya timezone and current signed timestamp. Compare the merchant/terminal/key combination with the sandbox credentials supplied by Moamalat, and inspect gateway logs for a failed merchant reference. Never bypass server verification or mark a booking paid merely from the browser callback.

After deployment, repeat both sandbox card payments, cancel/error/retry, paid confirmation and ledger checks. Review the three earlier QA reservations listed in the testing report and cancel any that remain pending.
