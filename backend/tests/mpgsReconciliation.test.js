import test from "node:test";
import assert from "node:assert/strict";
import {
  reconcileMpgs,
  __testing,
} from "../services/mpgsReconciliation.service.js";

const configuredEnv = {
  MPGS_BASE_URL: "https://example.gateway.mastercard.com",
  MPGS_MERCHANT_ID: "TESTMERCHANT",
  MPGS_API_PASSWORD: "secret",
  MPGS_API_VERSION: "100",
  MPGS_CURRENCY: "LYD",
};

const queryReturning = (rows) => ({
  select() { return this; },
  limit() { return this; },
  async lean() { return rows; },
});

test("reconciliation stays dormant without complete MPGS configuration", async () => {
  let queried = false;
  const result = await reconcileMpgs({
    env: {},
    PaymentModel: { find: () => { queried = true; } },
  });
  assert.equal(result.skipped, true);
  assert.equal(queried, false);
  assert.equal(__testing.isConfigured({}), false);
});

test("reconciles abandoned browser payments and pending refunds", async () => {
  const paymentRows = [
    { _id: "p1", merchantReference: "ORDER-1", customerId: "c1" },
    { _id: "p2", merchantReference: "ORDER-2", customerId: "c2" },
  ];
  const refundRows = [{ _id: "r1", bookingId: "b1" }];
  const verified = [];
  const refunded = [];
  const result = await reconcileMpgs({
    env: configuredEnv,
    PaymentModel: { find: () => queryReturning(paymentRows) },
    RefundModel: { find: () => queryReturning(refundRows) },
    paymentService: {
      async verify(input) {
        verified.push(input);
        return { verified: input.orderId === "ORDER-1" };
      },
    },
    refundProcessor: async (bookingId) => {
      refunded.push(bookingId);
      return { refunded: true };
    },
  });

  assert.deepEqual(verified, [
    { orderId: "ORDER-1", customerId: "c1" },
    { orderId: "ORDER-2", customerId: "c2" },
  ]);
  assert.deepEqual(refunded, ["b1"]);
  assert.equal(result.paymentsChecked, 2);
  assert.equal(result.paymentsCompleted, 1);
  assert.equal(result.refundsCompleted, 1);
});

test("one gateway failure does not stop the remaining reconciliation batch", async () => {
  const result = await reconcileMpgs({
    env: configuredEnv,
    PaymentModel: {
      find: () => queryReturning([
        { _id: "p1", merchantReference: "FAIL", customerId: "c1" },
        { _id: "p2", merchantReference: "OK", customerId: "c2" },
      ]),
    },
    RefundModel: { find: () => queryReturning([]) },
    paymentService: {
      async verify({ orderId }) {
        if (orderId === "FAIL") throw new Error("gateway unavailable");
        return { verified: true };
      },
    },
  });
  assert.equal(result.paymentFailures, 1);
  assert.equal(result.paymentsCompleted, 1);
});
