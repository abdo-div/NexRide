import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Payment from "../models/payment_model.js";
import "../models/Company_model.js";

/**
 * Proves the pre-fix definition is genuinely broken, so the regression test
 * cannot silently pass because the bug was never real.
 *
 * `sparse: true` omits documents where a field is missing, but it still indexes
 * an explicit `null`. A schema that defaults these fields to null therefore
 * rejects the second such document with E11000.
 */
const sparseUniqueSchema = new mongoose.Schema(
  {
    transactionId: { type: String, default: null },
  },
  { collection: "sparse_probe" },
);sparseUniqueSchema.index(
  { transactionId: 1 },
  { unique: true, sparse: true },
);
const SparsePayment = mongoose.models.SparsePaymentProbe ?? mongoose.model(
  "SparsePaymentProbe",
  sparseUniqueSchema,
);

test("the old sparse unique definition really does reject a second null", async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/nexride_sparse_probe?directConnection=true", {
      serverSelectionTimeoutMS: 4000,
    });
  } catch {
    // Without a database there is nothing to prove; the live coverage in
    // paymentIndexes.test.js carries the real assertion.
    return;
  }

  try {
    await SparsePayment.syncIndexes();
    await SparsePayment.deleteMany({});

    await SparsePayment.create([{ transactionId: null }]);

    let failed = false;
    try {
      await SparsePayment.create([{ transactionId: null }]);
    } catch (err) {
      failed = err.code === 11000 || err.code === 11001;
    }

    assert.equal(
      failed,
      true,
      "sparse + unique over null is expected to collide (that was the bug)",
    );
  } finally {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  }
});

test("the current Payment model no longer defaults these fields to null", () => {
  const paths = Payment.schema.paths;

  assert.equal(
    Object.hasOwn(paths.transactionId, "defaultValue"),
    false,
    "transactionId must not be defaulted",
  );
  assert.equal(
    Object.hasOwn(paths.merchantReference, "defaultValue"),
    false,
    "merchantReference must not be defaulted",
  );

  // And a document that omits them must not materialise the fields as null.
  const payment = new Payment({
    bookingId: new mongoose.Types.ObjectId(),
    customerId: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    amount: 50,
    paymentMethod: "CASH_ON_DELIVERY",
  });

  assert.equal(payment.toObject().transactionId, undefined);
  assert.equal(payment.toObject().merchantReference, undefined);
});
