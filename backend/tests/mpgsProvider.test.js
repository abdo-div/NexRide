import test from "node:test";
import assert from "node:assert/strict";
import { MpgsProvider } from "../payments/providers/mpgs/mpgs.provider.js";
import { MpgsError } from "../payments/providers/mpgs/mpgs.errors.js";
import {
  generateOrderId,
  normalizeAmount,
} from "../payments/providers/mpgs/mpgs.validation.js";

const createClient = (response) => {
  const calls = [];
  return {
    config: { currency: "LYD" },
    calls,
    async request(request) {
      calls.push(request);
      return typeof response === "function" ? response(request) : response;
    },
  };
};

const checkoutInput = Object.freeze({
  orderId: "ORDER-123",
  amount: "15.500",
  description: "Portable MPGS checkout test",
  merchantName: "Digital Group",
  operation: "PURCHASE",
  returnUrl: "https://shop.example.com/payment/return",
  cancelUrl: "https://shop.example.com/payment/cancel",
});

test("creates a normalized Hosted Checkout session", async () => {
  const client = createClient({
    result: "SUCCESS",
    session: { id: "SESSION-1", version: "7" },
    successIndicator: "SUCCESS-INDICATOR",
  });
  const provider = new MpgsProvider({ client });

  const checkout = await provider.createCheckout(checkoutInput);

  assert.deepEqual(checkout, {
    provider: "MPGS",
    orderId: "ORDER-123",
    amount: "15.5",
    currency: "LYD",
    operation: "PURCHASE",
    sessionId: "SESSION-1",
    sessionVersion: "7",
    successIndicator: "SUCCESS-INDICATOR",
  });
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].method, "POST");
  assert.equal(client.calls[0].path, "/session");
  assert.deepEqual(client.calls[0].body, {
    apiOperation: "INITIATE_CHECKOUT",
    checkoutMode: "WEBSITE",
    interaction: {
      operation: "PURCHASE",
      merchant: { name: "Digital Group" },
      returnUrl: "https://shop.example.com/payment/return",
      cancelUrl: "https://shop.example.com/payment/cancel",
    },
    order: {
      id: "ORDER-123",
      amount: "15.5",
      currency: "LYD",
      description: "Portable MPGS checkout test",
    },
  });
});

test("generates a gateway-safe unique order ID when omitted", async () => {
  const client = createClient({
    result: "SUCCESS",
    session: { id: "SESSION-2" },
    successIndicator: "INDICATOR-2",
  });
  const provider = new MpgsProvider({ client });
  const checkout = await provider.createCheckout({
    ...checkoutInput,
    orderId: undefined,
    orderPrefix: "company domains",
  });

  assert.match(checkout.orderId, /^COMPANYDOM-[A-F0-9]{29}$/);
  assert.ok(checkout.orderId.length <= 40);
});

test("rejects invalid checkout inputs before contacting MPGS", async () => {
  const invalidInputs = [
    { ...checkoutInput, amount: 0 },
    { ...checkoutInput, amount: "1.2345" },
    { ...checkoutInput, orderId: "order/unsafe" },
    { ...checkoutInput, description: "" },
    { ...checkoutInput, merchantName: "x".repeat(41) },
    { ...checkoutInput, operation: "CAPTURE" },
    { ...checkoutInput, returnUrl: "javascript:alert(1)" },
    { ...checkoutInput, returnUrl: "http://public.example.com" },
  ];

  for (const input of invalidInputs) {
    const client = createClient({});
    await assert.rejects(() => new MpgsProvider({ client }).createCheckout(input));
    assert.equal(client.calls.length, 0);
  }
});

test("allows localhost HTTP return URLs for development", async () => {
  const client = createClient({
    result: "SUCCESS",
    session: { id: "LOCAL-SESSION" },
    successIndicator: "LOCAL-INDICATOR",
  });
  const provider = new MpgsProvider({ client });

  await provider.createCheckout({
    ...checkoutInput,
    returnUrl: "http://localhost:5173/payment/return",
    cancelUrl: undefined,
  });

  assert.equal(
    client.calls[0].body.interaction.returnUrl,
    "http://localhost:5173/payment/return",
  );
});

test("rejects incomplete successful session responses", async () => {
  for (const response of [
    { result: "FAILURE" },
    { result: "SUCCESS", successIndicator: "x" },
    { result: "SUCCESS", session: { id: "x" } },
  ]) {
    const provider = new MpgsProvider({ client: createClient(response) });
    await assert.rejects(
      () => provider.createCheckout(checkoutInput),
      (error) => error instanceof MpgsError,
    );
  }
});

test("verifies a captured purchase only after matching order data", async () => {
  const client = createClient({
    result: "SUCCESS",
    id: "ORDER-123",
    amount: 15.5,
    currency: "LYD",
    status: "CAPTURED",
    totalCapturedAmount: 15.5,
    fundingStatus: "FUNDING_ASSURED",
    lastUpdatedTime: "2026-11-03T12:00:00.000Z",
    transaction: [
      { id: "TXN-1", result: "SUCCESS" },
      { id: "TXN-2", result: "SUCCESS" },
    ],
  });
  const provider = new MpgsProvider({ client });

  const result = await provider.verifyPayment({
    orderId: "ORDER-123",
    expectedAmount: "15.500",
    expectedCurrency: "lyd",
    operation: "PURCHASE",
  });

  assert.equal(result.verified, true);
  assert.equal(result.outcome, "SUCCEEDED");
  assert.equal(result.gatewayStatus, "CAPTURED");
  assert.equal(result.transactionId, "TXN-2");
  assert.equal(client.calls[0].path, "/order/ORDER-123");
});

test("never verifies mismatched order identity, amount, or currency", async () => {
  for (const changed of [
    { id: "OTHER" },
    { amount: "16.00" },
    { currency: "USD" },
  ]) {
    const client = createClient({
      result: "SUCCESS",
      id: "ORDER-123",
      amount: "15.50",
      currency: "LYD",
      status: "CAPTURED",
      totalCapturedAmount: "15.50",
      ...changed,
    });
    const result = await new MpgsProvider({ client }).verifyPayment({
      orderId: "ORDER-123",
      expectedAmount: "15.50",
      expectedCurrency: "LYD",
      operation: "PURCHASE",
    });
    assert.equal(result.verified, false);
    assert.equal(result.outcome, "MISMATCH");
  }
});

test("does not verify a partially captured purchase", async () => {
  const provider = new MpgsProvider({
    client: createClient({
      result: "SUCCESS",
      id: "ORDER-123",
      amount: "15.50",
      currency: "LYD",
      status: "PARTIALLY_CAPTURED",
      totalCapturedAmount: "10.00",
    }),
  });
  const result = await provider.verifyPayment({
    orderId: "ORDER-123",
    expectedAmount: "15.50",
    expectedCurrency: "LYD",
  });
  assert.equal(result.verified, false);
  assert.equal(result.outcome, "UNVERIFIED");
});

test("normalizes pending and failed gateway orders", async () => {
  const base = { id: "ORDER-123", amount: "15.5", currency: "LYD" };
  for (const [gateway, outcome] of [
    [{ ...base, result: "PENDING", status: "INITIATED" }, "PENDING"],
    [{ ...base, result: "FAILURE", status: "FAILED" }, "FAILED"],
    [{ ...base, result: "UNKNOWN", status: "UNKNOWN" }, "PENDING"],
  ]) {
    const result = await new MpgsProvider({
      client: createClient(gateway),
    }).verifyPayment({
      orderId: "ORDER-123",
      expectedAmount: "15.5",
      expectedCurrency: "LYD",
    });
    assert.equal(result.verified, false);
    assert.equal(result.outcome, outcome);
  }
});

test("supports an authorization-only checkout verification", async () => {
  const result = await new MpgsProvider({
    client: createClient({
      result: "SUCCESS",
      id: "ORDER-123",
      amount: "15.5",
      currency: "LYD",
      status: "AUTHORIZED",
      totalCapturedAmount: "0",
      totalAuthorizedAmount: "15.5",
    }),
  }).verifyPayment({
    orderId: "ORDER-123",
    expectedAmount: "15.5",
    expectedCurrency: "LYD",
    operation: "AUTHORIZE",
  });
  assert.equal(result.verified, true);
  assert.equal(result.outcome, "SUCCEEDED");
});

test("does not verify a partial authorization", async () => {
  const result = await new MpgsProvider({
    client: createClient({
      result: "SUCCESS",
      id: "ORDER-123",
      amount: "15.5",
      currency: "LYD",
      status: "AUTHORIZED",
      totalAuthorizedAmount: "10",
    }),
  }).verifyPayment({
    orderId: "ORDER-123",
    expectedAmount: "15.5",
    expectedCurrency: "LYD",
    operation: "AUTHORIZE",
  });
  assert.equal(result.verified, false);
  assert.equal(result.outcome, "UNVERIFIED");
});

test("amount normalization preserves at most three exact decimal places", () => {
  assert.equal(normalizeAmount("10.000"), "10");
  assert.equal(normalizeAmount("10.120"), "10.12");
  assert.equal(normalizeAmount(10.5), "10.5");
  assert.throws(() => normalizeAmount("10.0001"), /three decimal places/);
});

test("generated order IDs are unique and remain inside MPGS limits", () => {
  const first = generateOrderId("digital group");
  const second = generateOrderId("digital group");
  assert.notEqual(first, second);
  assert.match(first, /^[A-Z0-9_-]{1,40}$/);
  assert.ok(first.length <= 40);
});

test("submits a linked MPGS refund with a new transaction ID", async () => {
  const client = createClient({
    result: "SUCCESS",
    response: { gatewayCode: "APPROVED", acquirerCode: "00" },
    transaction: { id: "REFUND-1" },
  });
  const result = await new MpgsProvider({ client }).refundPayment({
    orderId: "ORDER-123",
    refundTransactionId: "REFUND-1",
    targetTransactionId: "TRANSACTION-1",
    amount: "10.500",
    currency: "lyd",
  });
  assert.equal(result.refunded, true);
  assert.equal(result.outcome, "SUCCEEDED");
  assert.deepEqual(client.calls[0], {
    method: "PUT",
    path: "/order/ORDER-123/transaction/REFUND-1",
    body: {
      apiOperation: "REFUND",
      transaction: {
        amount: "10.5",
        currency: "LYD",
        targetTransactionId: "TRANSACTION-1",
      },
    },
  });
});

test("normalizes pending and rejected MPGS refunds", async () => {
  for (const [gateway, outcome] of [
    [{ result: "PENDING", response: { gatewayCode: "PENDING" } }, "PENDING"],
    [{ result: "FAILURE", response: { gatewayCode: "DECLINED" } }, "FAILED"],
  ]) {
    const result = await new MpgsProvider({
      client: createClient(gateway),
    }).refundPayment({
      orderId: "ORDER-123",
      refundTransactionId: "REFUND-1",
      targetTransactionId: "TRANSACTION-1",
      amount: "10",
      currency: "LYD",
    });
    assert.equal(result.refunded, false);
    assert.equal(result.outcome, outcome);
  }
});

test("rejects unsafe refund input before calling MPGS", async () => {
  const client = createClient({});
  await assert.rejects(() => new MpgsProvider({ client }).refundPayment({
    orderId: "../order",
    refundTransactionId: "REFUND-1",
    targetTransactionId: "TRANSACTION-1",
    amount: "10",
    currency: "LYD",
  }));
  assert.equal(client.calls.length, 0);
});

test("requires a compatible MPGS client", () => {
  assert.throws(() => new MpgsProvider({}), /client is required/);
  assert.throws(() => new MpgsProvider({ client: {} }), /client is required/);
});
