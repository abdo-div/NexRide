import test from "node:test";
import assert from "node:assert/strict";
import {
  isMpgsSimulatorEnabled,
  MpgsSimulatorService,
} from "../services/mpgsSimulator.service.js";

const booking = () => ({
  _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
  customerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
  companyId: "cccccccccccccccccccccccc",
  vehicleId: "dddddddddddddddddddddddd",
  totalAmount: 90,
  bookingStatus: "PENDING_PAYMENT",
  paymentStatus: "UNPAID",
});

const paymentModel = () => {
  class FakePayment {
    static rows = [];
    constructor(fields) {
      Object.assign(this, fields, { _id: "eeeeeeeeeeeeeeeeeeeeeeee" });
      FakePayment.rows.push(this);
    }
    async save() {}
    static async findOne(query) {
      if (query.status === "COMPLETED") return null;
      return FakePayment.rows.find((row) =>
        (!query.merchantReference || row.merchantReference === query.merchantReference) &&
        (!query.paymentGateway || row.paymentGateway === query.paymentGateway)
      ) ?? null;
    }
  }
  return FakePayment;
};

test("simulator is available in development and impossible in production", () => {
  assert.equal(isMpgsSimulatorEnabled({ NODE_ENV: "development" }), true);
  assert.equal(isMpgsSimulatorEnabled({ NODE_ENV: "test" }), true);
  assert.equal(isMpgsSimulatorEnabled({ NODE_ENV: "production" }), false);
  assert.equal(
    isMpgsSimulatorEnabled({ NODE_ENV: "development", MPGS_SIMULATOR: "false" }),
    false,
  );
});

test("creates an explicitly audited simulated MPGS attempt", async () => {
  const ownedBooking = booking();
  const PaymentModel = paymentModel();
  const service = new MpgsSimulatorService({
    BookingModel: { findById: async () => ownedBooking },
    PaymentModel,
    env: { NODE_ENV: "development", MPGS_SIMULATOR: "true" },
  });
  const result = await service.initialize({
    bookingId: ownedBooking._id,
    customerId: ownedBooking.customerId,
  });
  assert.equal(result.checkout.provider, "MPGS_SIMULATOR");
  assert.equal(result.checkout.simulated, true);
  assert.equal(result.payment.paymentGateway, "MPGS_SIMULATOR");
  assert.equal(result.payment.paymentMethod, "MPGS");
  assert.equal(result.payment.isSimulated, true);
  assert.match(result.checkout.orderId, /^SIM/);
});

test("completes only the owning customer's simulated payment", async () => {
  const ownedBooking = booking();
  const PaymentModel = paymentModel();
  let finalized;
  const service = new MpgsSimulatorService({
    BookingModel: { findById: async () => ownedBooking },
    PaymentModel,
    finalizePayment: async (input) => {
      finalized = input;
      ownedBooking.bookingStatus = "PAID";
      ownedBooking.paymentStatus = "PAID";
      return { payment: PaymentModel.rows[0], booking: ownedBooking };
    },
    env: { NODE_ENV: "test" },
  });
  const initialized = await service.initialize({
    bookingId: ownedBooking._id,
    customerId: ownedBooking.customerId,
  });
  const result = await service.complete({
    orderId: initialized.checkout.orderId,
    customerId: ownedBooking.customerId,
  });
  assert.equal(finalized.expectedGateway, "MPGS_SIMULATOR");
  assert.match(finalized.transactionId, /^SIM-TXN-/);
  assert.equal(result.booking.paymentStatus, "PAID");

  await assert.rejects(
    () => service.complete({
      orderId: initialized.checkout.orderId,
      customerId: "ffffffffffffffffffffffff",
    }),
    (error) => error.statusCode === 403,
  );
});

test("production refuses simulation before reading a booking", async () => {
  let bookingRead = false;
  const service = new MpgsSimulatorService({
    BookingModel: { findById: async () => { bookingRead = true; } },
    PaymentModel: paymentModel(),
    env: { NODE_ENV: "production", MPGS_SIMULATOR: "true" },
  });
  await assert.rejects(
    () => service.initialize({ bookingId: "a", customerId: "b" }),
    (error) => error.statusCode === 404,
  );
  assert.equal(bookingRead, false);
});
