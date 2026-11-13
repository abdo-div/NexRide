import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import { verifyAggregatorWebhook } from "../services/paymentAggregator.service.js";

const secret = "whsec_nexride_test_secret";

test("accepts an authentic aggregator webhook and rejects tampering", () => {
  process.env.PAYMENT_AGGREGATOR_WEBHOOK_SECRET = secret;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const rawBody = JSON.stringify({ id: "evt_test", type: "payment.succeeded", data: {} });
  const signature = `v1=${crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;

  assert.doesNotThrow(() => verifyAggregatorWebhook({ rawBody, timestamp, signature }));
  assert.throws(
    () => verifyAggregatorWebhook({ rawBody: `${rawBody} `, timestamp, signature }),
    /Invalid webhook signature/,
  );
});

test("rejects stale aggregator webhook timestamps", () => {
  process.env.PAYMENT_AGGREGATOR_WEBHOOK_SECRET = secret;
  const timestamp = Math.floor(Date.now() / 1000 - 600).toString();
  assert.throws(
    () => verifyAggregatorWebhook({ rawBody: "{}", timestamp, signature: "v1=invalid" }),
    /Invalid webhook timestamp/,
  );
});
