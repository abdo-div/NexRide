# Reservation checkout fixes

Checkout now validates and persists primary driver contact details and the customer's eligibility declaration. This declaration is not document verification. Pickup and return times are converted from Libya local time into explicit ISO instants before availability checks and booking creation. Price calculations use rounded-up elapsed days throughout.

Payment retries in the same checkout reuse the created booking. The booking request has a stable idempotency key across uncertain network failures; saved bookings can also be paid from My Bookings. Date formatting on the payment page accepts persisted ISO timestamps, and lazy routes have a recoverable render-error boundary.

The vehicle detail quote includes the municipal/platform fee. The hardcoded two-day minimum is removed because there is no corresponding operator/backend policy. Optional extras start unselected. Confirmation lists saved extras and fees, displays the saved driver's identity, and reflects unpaid status without inventing passport verification, message delivery, card escrow or airport dispatch. Any deposit is confirmed by the operator at pickup.

## Validation

- Frontend: `npm test` (14 tests), `npm run lint`, `npm run build`.
- Backend: bookingCheckoutValidation, bookingCashCheckout, bookingCollision, bookingConcurrency, bookingExpiry, bookingPricing, moamalatSecurity, paymentProcessing and moamalatConfig (64 distinct focused tests).
- Local browser with an isolated API fixture: empty-driver and eligibility rejection; failure and retry create only one booking; resume payment renders; Change Dates retains choices; cash confirmation retains 2 PM and the itemized fee.
- Tests use mocked persistence and gateway responses. They do not confirm the hosted MongoDB/Redis or Moamalat payment success.

## Deployment and open gateway issue

Deploy backend and frontend together: new customer booking requests require `primaryDriver`, positive eligibility and explicit ISO timestamps. Existing saved bookings remain readable and payable; their missing driver snapshot falls back to the account name. Do not reinterpret legacy date-only reservations as selected pickup times; those choices were never stored.

Both supplied sandbox cards failed with Moamalat `Order not found / Response: 61` before these changes. Its cause is not established. Signing still uses the documented canonical amount/timestamp/merchant/terminal fields and server-side HMAC. This change trims deployment credentials and rejects malformed hex keys but does not claim to solve every gateway configuration error.

Run `npm run diagnose:moamalat` from the backend directory on Render. Its output excludes credential values and card data. Check the selected environment, configured flags, valid hex key, gateway endpoints, Libya timezone and current signed timestamp. Compare the merchant/terminal/key combination with the sandbox credentials supplied by Moamalat, and inspect gateway logs for a failed merchant reference. Never bypass server verification or mark a booking paid merely from the browser callback.

After deployment, repeat both sandbox card payments, cancel/error/retry, paid confirmation and ledger checks. Review the three earlier QA reservations listed in the testing report and cancel any that remain pending.
