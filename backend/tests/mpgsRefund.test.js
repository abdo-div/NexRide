import test from "node:test";
import assert from "node:assert/strict";
import { processPendingMpgsRefundByBooking } from "../services/mpgsRefund.service.js";
import { processMpgsRefundSchema } from "../validations/mpgs.validation.js";

const makeRefund = (overrides = {}) => ({
  _id: "ffffffffffffffffffffffff",
  bookingId: "aaaaaaaaaaaaaaaaaaaaaaaa",
  paymentId: "eeeeeeeeeeeeeeeeeeeeeeee",
  customerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
  amount: 50,
  currency: "LYD",
  status: "PENDING",
  gatewayRefundTransactionId: null,
  saves: 0,
  async save() { this.saves += 1; },
  ...overrides,
});

const makePayment = (overrides = {}) => ({
  _id: "eeeeeeeeeeeeeeeeeeeeeeee",
  paymentMethod: "MPGS",
  paymentGateway: "MPGS",
  merchantReference: "ORDER-1",
  transactionId: "PAYMENT-TXN-1",
  currency: "LYD",
  status: "REFUNDED",
  ...overrides,
});

const refundModel = (refund, { claim = refund } = {}) => ({
  findOne: () => ({ sort: async () => refund }),
  findOneAndUpdate: async () => claim,
});

test("processes the policy-calculated MPGS refund amount", async () => {
  const refund = makeRefund({ amount: 50 });
  const payment = makePayment();
  let gatewayInput;
  const result = await processPendingMpgsRefundByBooking(refund.bookingId, {
    customerId: refund.customerId,
    RefundModel: refundModel(refund),
    PaymentModel: { findById: async () => payment },
    providerFactory: () => ({
      async refundPayment(input) {
        gatewayInput = input;
        return {
          refunded: true,
          outcome: "SUCCEEDED",
          gatewayCode: "APPROVED",
          refundTransactionId: input.refundTransactionId,
        };
      },
    }),
  });

  assert.equal(gatewayInput.orderId, "ORDER-1");
  assert.equal(gatewayInput.targetTransactionId, "PAYMENT-TXN-1");
  assert.equal(gatewayInput.amount, "50");
  assert.equal(gatewayInput.currency, "LYD");
  assert.match(gatewayInput.refundTransactionId, /^RF-[A-Za-z0-9_-]+$/);
  assert.equal(result.refunded, true);
  assert.equal(refund.status, "COMPLETED");
  assert.equal(refund.gatewayCode, "APPROVED");
  assert.ok(refund.completedAt instanceof Date);
});

test("partial refunds submit only the stored refundable amount", async () => {
  const refund = makeRefund({ amount: 25, refundFraction: 0.5 });
  let submittedAmount;
  await processPendingMpgsRefundByBooking(refund.bookingId, {
    customerId: refund.customerId,
    RefundModel: refundModel(refund),
    PaymentModel: { findById: async () => makePayment({ status: "PARTIALLY_REFUNDED" }) },
    providerFactory: () => ({
      async refundPayment(input) {
        submittedAmount = input.amount;
        return { refunded: true, outcome: "SUCCEEDED", gatewayCode: "APPROVED" };
      },
    }),
  });
  assert.equal(submittedAmount, "25");
});

test("completed refunds replay without another gateway request", async () => {
  const refund = makeRefund({
    status: "COMPLETED",
    gatewayRefundTransactionId: "RF-EXISTING",
  });
  let gatewayCalls = 0;
  const result = await processPendingMpgsRefundByBooking(refund.bookingId, {
    customerId: refund.customerId,
    RefundModel: refundModel(refund),
    PaymentModel: { findById: async () => makePayment() },
    providerFactory: () => ({
      async refundPayment() { gatewayCalls += 1; },
    }),
  });
  assert.equal(result.alreadyProcessed, true);
  assert.equal(result.outcome, "SUCCEEDED");
  assert.equal(gatewayCalls, 0);
});

test("a concurrent processor cannot submit the refund twice", async () => {
  const refund = makeRefund();
  let gatewayCalls = 0;
  const result = await processPendingMpgsRefundByBooking(refund.bookingId, {
    customerId: refund.customerId,
    RefundModel: refundModel(refund, { claim: null }),
    PaymentModel: { findById: async () => makePayment() },
    providerFactory: () => ({
      async refundPayment() { gatewayCalls += 1; },
    }),
  });
  assert.equal(result.alreadyProcessing, true);
  assert.equal(result.outcome, "PENDING");
  assert.equal(gatewayCalls, 0);
});

test("a retry reuses the durable MPGS refund transaction ID", async () => {
  const refund = makeRefund({
    status: "FAILED",
    gatewayRefundTransactionId: "RF-DURABLE-1",
  });
  let submittedId;
  await processPendingMpgsRefundByBooking(refund.bookingId, {
    customerId: refund.customerId,
    RefundModel: refundModel(refund),
    PaymentModel: { findById: async () => makePayment() },
    providerFactory: () => ({
      async refundPayment(input) {
        submittedId = input.refundTransactionId;
        return { refunded: true, outcome: "SUCCEEDED", gatewayCode: "APPROVED" };
      },
    }),
  });
  assert.equal(submittedId, "RF-DURABLE-1");
});

test("rejected refunds remain failed and auditable", async () => {
  const refund = makeRefund();
  const result = await processPendingMpgsRefundByBooking(refund.bookingId, {
    customerId: refund.customerId,
    RefundModel: refundModel(refund),
    PaymentModel: { findById: async () => makePayment() },
    providerFactory: () => ({
      async refundPayment() {
        return { refunded: false, outcome: "FAILED", gatewayCode: "DECLINED" };
      },
    }),
  });
  assert.equal(result.refunded, false);
  assert.equal(refund.status, "FAILED");
  assert.equal(refund.failureReason, "DECLINED");
  assert.ok(refund.failedAt instanceof Date);
});

test("network ambiguity retains the transaction ID for retry", async () => {
  const refund = makeRefund();
  await assert.rejects(
    () => processPendingMpgsRefundByBooking(refund.bookingId, {
      customerId: refund.customerId,
      RefundModel: refundModel(refund),
      PaymentModel: { findById: async () => makePayment() },
      providerFactory: () => ({
        async refundPayment() { throw new Error("connection reset"); },
      }),
    }),
    /connection reset/,
  );
  assert.equal(refund.status, "FAILED");
  assert.match(refund.gatewayRefundTransactionId, /^RF-/);
  assert.equal(refund.failureReason, "connection reset");
});

test("customers cannot process another customer's refund", async () => {
  const refund = makeRefund();
  await assert.rejects(
    () => processPendingMpgsRefundByBooking(refund.bookingId, {
      customerId: "cccccccccccccccccccccccc",
      RefundModel: refundModel(refund),
      PaymentModel: { findById: async () => makePayment() },
    }),
    (error) => error.statusCode === 403,
  );
});

test("non-MPGS refunds are left to their own provider", async () => {
  const refund = makeRefund();
  const result = await processPendingMpgsRefundByBooking(refund.bookingId, {
    customerId: refund.customerId,
    RefundModel: refundModel(refund),
    PaymentModel: {
      findById: async () => makePayment({
        paymentMethod: "MOAMALAT",
        paymentGateway: "MOAMALAT",
      }),
    },
  });
  assert.equal(result.skipped, true);
  assert.equal(result.reason, "NOT_MPGS");
});

test("refund processing accepts only a booking ID", () => {
  assert.doesNotThrow(() => processMpgsRefundSchema.parse({
    body: { bookingId: "aaaaaaaaaaaaaaaaaaaaaaaa" },
  }));
  assert.throws(() => processMpgsRefundSchema.parse({
    body: { bookingId: "aaaaaaaaaaaaaaaaaaaaaaaa", amount: 1 },
  }));
});
