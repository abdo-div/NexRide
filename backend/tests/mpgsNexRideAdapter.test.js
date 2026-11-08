import test from "node:test";
import assert from "node:assert/strict";
import Payment from "../models/payment_model.js";
import {
  initiateMpgsPaymentSchema,
  verifyMpgsPaymentSchema,
} from "../validations/mpgs.validation.js";
import { NexRideMpgsService } from "../services/mpgs.service.js";

const booking = (overrides = {}) => ({
  _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
  customerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
  companyId: "cccccccccccccccccccccccc",
  vehicleId: "dddddddddddddddddddddddd",
  totalAmount: 125.5,
  bookingStatus: "PENDING_PAYMENT",
  paymentStatus: "UNPAID",
  async save() {},
  ...overrides,
});

const payment = (overrides = {}) => ({
  _id: "eeeeeeeeeeeeeeeeeeeeeeee",
  bookingId: "aaaaaaaaaaaaaaaaaaaaaaaa",
  customerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
  companyId: "cccccccccccccccccccccccc",
  amount: 125.5,
  currency: "LYD",
  paymentMethod: "MPGS",
  paymentGateway: "MPGS",
  merchantReference: "ORDER-1",
  gatewayOperation: "PURCHASE",
  gatewaySuccessIndicator: "INDICATOR-1",
  status: "PENDING",
  saves: 0,
  async save() { this.saves += 1; },
  ...overrides,
});

const paymentModel = ({ pending = null, completed = null } = {}) => {
  class FakePayment {
    static created = [];
    constructor(fields) {
      Object.assign(this, fields, { _id: "eeeeeeeeeeeeeeeeeeeeeeee", saves: 0 });
      FakePayment.created.push(this);
    }
    async save() { this.saves += 1; }
    static async findOne(query) {
      if (query.status === "COMPLETED") return completed;
      if (query.status === "PENDING") return pending;
      if (query.merchantReference) return pending;
      return null;
    }
  }
  return FakePayment;
};

test("initialization charges the stored booking amount and persists MPGS session data", async () => {
  const ownedBooking = booking();
  const PaymentModel = paymentModel();
  let checkoutInput;
  const provider = {
    async createCheckout(input) {
      checkoutInput = input;
      return {
        provider: "MPGS",
        orderId: input.orderId,
        amount: input.amount,
        currency: "LYD",
        operation: "PURCHASE",
        sessionId: "SESSION-1",
        sessionVersion: "1",
        successIndicator: "INDICATOR-1",
      };
    },
  };
  const service = new NexRideMpgsService({
    BookingModel: { findById: async () => ownedBooking },
    PaymentModel,
    providerFactory: () => provider,
    clientUrlFactory: () => "https://nexride.example",
    env: {
      MPGS_CURRENCY: "LYD",
      MPGS_OPERATION: "PURCHASE",
      MPGS_MERCHANT_NAME: "NexRide",
    },
  });

  const result = await service.initialize({
    bookingId: ownedBooking._id,
    customerId: ownedBooking.customerId,
  });

  assert.equal(checkoutInput.amount, "125.5");
  assert.equal(
    checkoutInput.returnUrl,
    `https://nexride.example/?orderId=${checkoutInput.orderId}#/payment/mpgs/return`,
  );
  assert.equal(
    checkoutInput.cancelUrl,
    `https://nexride.example/?orderId=${checkoutInput.orderId}#/payment/mpgs/cancel`,
  );
  assert.equal(PaymentModel.created.length, 1);
  assert.equal(result.payment.paymentMethod, "MPGS");
  assert.equal(result.payment.gatewaySessionId, "SESSION-1");
  assert.equal(result.payment.gatewaySuccessIndicator, "INDICATOR-1");
  assert.ok(ownedBooking.paymentSessionExpiresAt instanceof Date);
});

test("initialization refuses another customer's booking before gateway checkout", async () => {
  let checkoutCalls = 0;
  const service = new NexRideMpgsService({
    BookingModel: { findById: async () => booking() },
    PaymentModel: paymentModel(),
    providerFactory: () => ({
      async createCheckout() { checkoutCalls += 1; },
    }),
  });

  await assert.rejects(
    () => service.initialize({
      bookingId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      customerId: "ffffffffffffffffffffffff",
    }),
    (error) => error.statusCode === 403,
  );
  assert.equal(checkoutCalls, 0);
});

test("repeated initialization reuses the durable gateway session and order", async () => {
  const ownedBooking = booking({
    paymentSessionExpiresAt: new Date(Date.now() + 60_000),
  });
  const pending = payment({
    gatewaySessionId: "SESSION-EXISTING",
    gatewaySuccessIndicator: "INDICATOR-EXISTING",
  });
  let checkoutCalls = 0;
  const service = new NexRideMpgsService({
    BookingModel: { findById: async () => ownedBooking },
    PaymentModel: paymentModel({ pending }),
    providerFactory: () => ({
      async createCheckout() { checkoutCalls += 1; },
    }),
    env: { MPGS_OPERATION: "PURCHASE" },
  });

  const result = await service.initialize({
    bookingId: ownedBooking._id,
    customerId: ownedBooking.customerId,
  });
  assert.equal(checkoutCalls, 0);
  assert.equal(result.checkout.orderId, "ORDER-1");
  assert.equal(result.checkout.sessionId, "SESSION-EXISTING");
  assert.equal(result.checkout.reused, true);
});

test("verification uses stored ledger values and finalizes a successful capture", async () => {
  const ownedBooking = booking();
  const pending = payment();
  let verifyInput;
  let finalizeInput;
  const service = new NexRideMpgsService({
    BookingModel: { findById: async () => ownedBooking },
    PaymentModel: paymentModel({ pending }),
    providerFactory: () => ({
      async verifyPayment(input) {
        verifyInput = input;
        return {
          verified: true,
          outcome: "SUCCEEDED",
          gatewayStatus: "CAPTURED",
          transactionId: "TRANSACTION-1",
        };
      },
    }),
    finalizePayment: async (input) => {
      finalizeInput = input;
      pending.status = "COMPLETED";
      ownedBooking.bookingStatus = "PAID";
      ownedBooking.paymentStatus = "PAID";
      return { payment: pending, booking: ownedBooking, alreadyProcessed: false };
    },
  });

  const result = await service.verify({
    orderId: "ORDER-1",
    resultIndicator: "INDICATOR-1",
    customerId: ownedBooking.customerId,
  });

  assert.deepEqual(verifyInput, {
    orderId: "ORDER-1",
    expectedAmount: "125.5",
    expectedCurrency: "LYD",
    operation: "PURCHASE",
  });
  assert.equal(finalizeInput.transactionId, "TRANSACTION-1");
  assert.equal(result.verified, true);
  assert.equal(result.indicatorMatches, true);
});

test("a forged result indicator cannot replace server-side verification", async () => {
  const ownedBooking = booking();
  const pending = payment();
  let gatewayChecked = false;
  const service = new NexRideMpgsService({
    BookingModel: { findById: async () => ownedBooking },
    PaymentModel: paymentModel({ pending }),
    providerFactory: () => ({
      async verifyPayment() {
        gatewayChecked = true;
        return { verified: false, outcome: "PENDING", gatewayStatus: "INITIATED" };
      },
    }),
  });

  const result = await service.verify({
    orderId: "ORDER-1",
    resultIndicator: "FORGED",
    customerId: ownedBooking.customerId,
  });
  assert.equal(gatewayChecked, true);
  assert.equal(result.verified, false);
  assert.equal(result.indicatorMatches, false);
  assert.equal(pending.status, "PENDING");
});

test("terminal gateway failure retires the payment and releases the booking", async () => {
  const ownedBooking = booking();
  const pending = payment();
  let releaseInput;
  const service = new NexRideMpgsService({
    BookingModel: { findById: async () => ownedBooking },
    PaymentModel: paymentModel({ pending }),
    providerFactory: () => ({
      async verifyPayment() {
        return { verified: false, outcome: "FAILED", gatewayStatus: "FAILED" };
      },
    }),
    releaseBooking: async (...args) => { releaseInput = args; },
  });

  const result = await service.verify({
    orderId: "ORDER-1",
    customerId: ownedBooking.customerId,
  });
  assert.equal(result.verified, false);
  assert.equal(pending.status, "FAILED");
  assert.equal(pending.saves, 1);
  assert.equal(releaseInput[0], ownedBooking._id);
});

test("completed verification replays without another gateway request", async () => {
  const ownedBooking = booking({ bookingStatus: "PAID", paymentStatus: "PAID" });
  const completed = payment({ status: "COMPLETED", transactionId: "TXN-1" });
  let providerCalls = 0;
  const service = new NexRideMpgsService({
    BookingModel: { findById: async () => ownedBooking },
    PaymentModel: paymentModel({ pending: completed }),
    providerFactory: () => ({
      async verifyPayment() { providerCalls += 1; },
    }),
  });
  const result = await service.verify({
    orderId: "ORDER-1",
    customerId: ownedBooking.customerId,
  });
  assert.equal(result.verified, true);
  assert.equal(result.alreadyProcessed, true);
  assert.equal(providerCalls, 0);
});

test("MPGS request schemas accept only server-safe fields", () => {
  assert.doesNotThrow(() => initiateMpgsPaymentSchema.parse({
    body: { bookingId: "aaaaaaaaaaaaaaaaaaaaaaaa" },
  }));
  assert.throws(() => initiateMpgsPaymentSchema.parse({
    body: { bookingId: "aaaaaaaaaaaaaaaaaaaaaaaa", amount: 1 },
  }));
  assert.doesNotThrow(() => verifyMpgsPaymentSchema.parse({
    body: { orderId: "ORDER_1-ABC", resultIndicator: "indicator" },
  }));
  assert.throws(() => verifyMpgsPaymentSchema.parse({
    body: { orderId: "../../unsafe" },
  }));
});

test("Payment model accepts MPGS as a payment method", async () => {
  const row = new Payment({
    bookingId: "aaaaaaaaaaaaaaaaaaaaaaaa",
    customerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    companyId: "cccccccccccccccccccccccc",
    amount: 10,
    paymentMethod: "MPGS",
    paymentGateway: "MPGS",
    merchantReference: "ORDER-1",
    gatewayOperation: "PURCHASE",
  });
  await assert.doesNotReject(() => row.validate());
});
