import assert from "node:assert/strict";
import { test } from "node:test";
import Payment from "../models/payment_model.js";
import { buildPayoutSummary, dispatchPayoutBatch, settlePayoutBatch } from "../services/payoutService.js";

test("payout summary calculates completed totals and excludes pending cash ledger entries", async (t) => {
  let aggregatePipeline;
  let activeRunFilter;
  t.mock.method(Payment, "aggregate", async (pipeline) => {
    aggregatePipeline = pipeline;
    return [{
      gross: 1000,
      platformTake: 80,
      companyEarnings: 920,
      unsettled: 400,
      processing: 200,
      settled: 400,
      adjustments: 30,
      bookings: 2,
      partners: ["company-1", "company-2"],
    }];
  });
  t.mock.method(Payment, "countDocuments", async (filter) => {
    activeRunFilter = filter;
    return 2;
  });

  const summary = await buildPayoutSummary();

  assert.deepEqual(aggregatePipeline[0].$match.status.$in, ["COMPLETED", "REFUNDED"]);
  assert.equal(summary.gross, 1000);
  assert.equal(summary.effectiveRate, 8);
  assert.equal(summary.pendingPayouts, 600);
  assert.equal(summary.paidPayouts, 400);
  assert.equal(summary.paidRatio, 40);
  assert.equal(summary.partnerCount, 2);
  assert.equal(activeRunFilter.status, "COMPLETED");
});

test("dispatch processes only completed unsettled payments", async (t) => {
  let distinctFilter;
  let updateFilter;
  let update;
  t.mock.method(Payment, "distinct", async (_field, filter) => {
    distinctFilter = filter;
    return ["company-1"];
  });
  t.mock.method(Payment, "updateMany", async (filter, updateDoc) => {
    updateFilter = filter;
    update = updateDoc;
    return { modifiedCount: 3 };
  });

  const result = await dispatchPayoutBatch();

  assert.deepEqual(distinctFilter, updateFilter);
  assert.deepEqual(updateFilter, { status: "COMPLETED", payoutStatus: "UNSETTLED" });
  assert.deepEqual(update, { $set: { payoutStatus: "PROCESSING" } });
  assert.equal(result.dispatched, 3);
  assert.equal(result.companies, 1);
});

test("dispatch can be scoped to the requested company IDs", async (t) => {
  let filter;
  t.mock.method(Payment, "distinct", async (_field, query) => {
    filter = query;
    return [];
  });
  t.mock.method(Payment, "updateMany", async (query) => {
    assert.deepEqual(query, filter);
    return { modifiedCount: 0 };
  });

  await dispatchPayoutBatch(["aaaaaaaaaaaaaaaaaaaaaaaa"]);

  assert.equal(filter.companyId.$in.length, 1);
  assert.equal(String(filter.companyId.$in[0]), "aaaaaaaaaaaaaaaaaaaaaaaa");
});

test("settlement marks only eligible completed payments as settled", async (t) => {
  let filter;
  let update;
  t.mock.method(Payment, "updateMany", async (query, updateDoc) => {
    filter = query;
    update = updateDoc;
    return { modifiedCount: 2 };
  });

  const result = await settlePayoutBatch("aaaaaaaaaaaaaaaaaaaaaaaa");

  assert.equal(filter.status, "COMPLETED");
  assert.deepEqual(filter.payoutStatus.$in, ["UNSETTLED", "PROCESSING"]);
  assert.equal(String(filter.companyId), "aaaaaaaaaaaaaaaaaaaaaaaa");
  assert.equal(update.$set.payoutStatus, "SETTLED");
  assert.ok(update.$set.payoutSettledAt instanceof Date);
  assert.deepEqual(result, { settled: 2 });
});
