# MPGS sandbox certification runbook

## Local simulation before credentials

In development, select **MPGS Simulator** at checkout. It needs no merchant
credentials, never contacts Mastercard, never asks for card data, and moves no
money. Simulated ledger rows are permanently marked `isSimulated` with gateway
`MPGS_SIMULATOR`. The simulator is unavailable when `NODE_ENV=production`.

This validates NexRide's booking and payment lifecycle only. It does not replace
the issued MPGS test merchant required for Hosted Checkout certification.

## 1. Obtain the test profile

Request these values from the acquiring bank or MPGS administrator:

- exact gateway base URL
- test merchant ID (normally prefixed with `TEST`)
- API password for that merchant
- supported REST API version
- enabled currency
- supported operation (`PURCHASE` or `AUTHORIZE`)
- test cards and expected response scenarios for that merchant profile

There is no universal public MPGS merchant account. Test cards alone are not
enough; the merchant profile and API password are required.

## 2. Configure NexRide locally

Add the seven `MPGS_*` values documented in
`backend/payments/.env.example` to the root `.env`. Never commit that file.
Restart both backend and frontend after changing the environment.

## 3. Preflight

1. Sign in as a customer.
2. Confirm `GET /api/v1/payments/mpgs/config` returns test environment, currency,
   and the hosted-checkout script URL without credentials.
3. Create a future booking and select **Mastercard MPGS**.
4. Confirm the browser redirects to the assigned gateway hostname.
5. Confirm no card number or CVV appears in NexRide requests, logs, storage, or
   database records.

## 4. Required sandbox scenarios

Run only the cards/scenarios supplied for the assigned test merchant:

1. approved purchase — booking and payment become paid/completed;
2. declined purchase — booking is released and payment becomes failed;
3. browser cancellation — no payment is marked completed;
4. close browser after approval — background reconciliation completes it;
5. duplicate return/verify — produces one completed payment;
6. amount/order tampering — verification returns mismatch;
7. full eligible cancellation — one approved refund transaction;
8. partial eligible cancellation — exact policy amount refunded;
9. duplicate refund retry — same MPGS refund transaction ID, one refund;
10. gateway/network outage — payment/refund remains auditable and retryable.

## 5. Evidence to retain

Record order IDs, transaction IDs, refund IDs, timestamps, normalized statuses,
and screenshots. Do not record API passwords, full card numbers, CVVs, OTPs, or
authentication cookies.

## 6. Production switch

Production requires a separate merchant ID/password and the production gateway
hostname. Confirm currency, 3-D Secure, settlement account, refund permission,
and webhook/reconciliation expectations with the acquirer. Perform one approved
low-value transaction and one refund, then confirm settlement in the merchant
portal/bank statement. Sandbox success does not prove bank settlement.
