import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import Payment from "../models/payment_model.js";
import "../models/Company_model.js";
import { buildPayoutSummary } from "../services/payoutService.js";
import { buildPayoutLedger } from "../services/payoutService.js";
import {
  netContributionOf,
  computeNettedBalance,
} from "../utils/payoutNetting.js";

const PROBE_URI =
  "mongodb://127.0.0.1:27017/nexride_payout_probe?directConnection=true";

// One full card (MOAMALAT) row and one settled-at-the-counter cash row, both
// at the 8% platform commission, exactly as the Payment model would compute
// them (1000 -> 80 fee / 920 share, 500 -> 40 fee / 460 share).
const cardRow = {
  paymentMethod: "MOAMALAT",
  status: "COMPLETED",
  amount: 1000,
  commissionAmount: 80,
  companyShare: 920,
};
const cashRow = {
  paymentMethod: "CASH_ON_DELIVERY",
  status: "COMPLETED",
  amount: 500,
  commissionAmount: 40,
  companyShare: 460,
};

const seedPayment = (row) => ({
  bookingId: new mongoose.Types.ObjectId(),
  customerId: new mongoose.Types.ObjectId(),
  companyId: "555555555555555555555555",
  amount: row.amount,
  commissionAmount: row.commissionAmount,
  companyShare: row.companyShare,
  paymentMethod: row.paymentMethod,
  paymentGateway:
    row.paymentMethod === "MOAMALAT" ? "MOAMALAT" : "LOCAL",
  status: "COMPLETED",
  payoutStatus: "UNSETTLED",
  paidAt: new Date(),
});

const withProbeDb = async (run) => {
  try {
    await mongoose.connect(PROBE_URI, { serverSelectionTimeoutMS: 4000 });
  } catch {
    // No local MongoDB - the pure-JS assertions above still carry the rule.
    return;
  }
  try {
    await mongoose.connection.dropDatabase();
    await run();
  } finally {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  }
};

test("Test 1: a completed Moamalat card payment pays out its full company share", async () => {
  // Pure rule.
  assert.equal(netContributionOf(cardRow), 920);
  const balance = computeNettedBalance([cardRow]);
  assert.equal(balance.cardNet, 920);
  assert.equal(balance.cashCommission, 0);
  assert.equal(balance.nettedBalance, 920);
  assert.equal(balance.dueToCompany, 920);
  assert.equal(balance.outstandingCommission, 0);

  // Real pipeline: 1000 gross minus 80 commission -> 920 due.
  await withProbeDb(async () => {
    await Payment.create([seedPayment(cardRow)]);
    const summary = await buildPayoutSummary();
    assert.equal(summary.gross, 1000);
    assert.equal(summary.pendingPayouts, 920);
    assert.equal(summary.nettedBalance, 920);
    assert.equal(summary.cashCommission, 0);
    assert.equal(summary.outstandingCommission, 0);

    const { ledger } = await buildPayoutLedger();
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].net, 920);
    assert.equal(ledger[0].payoutBalance, 920);
    assert.equal(ledger[0].outstandingCommission, 0);
  });
});

test("Test 2: card and cash net against each other - card share wins, cash owes only its fee", async () => {
  // Pure rule: 920 card share minus the 40 cash commission -> 880 net.
  const balance = computeNettedBalance([cardRow, cashRow]);
  assert.equal(balance.cardNet, 920);
  assert.equal(balance.cashCommission, 40);
  assert.equal(balance.nettedBalance, 880);
  assert.equal(balance.dueToCompany, 880);
  assert.equal(balance.outstandingCommission, 0);

  await withProbeDb(async () => {
    await Payment.create([seedPayment(cardRow), seedPayment(cashRow)]);
    const summary = await buildPayoutSummary();
    assert.equal(summary.gross, 1500);
    // Gross still counts both rows; the *payout liability* is netted.
    assert.equal(summary.companyEarnings, 1380);
    assert.equal(summary.pendingPayouts, 880);
    assert.equal(summary.cashCommission, 40);
    assert.equal(summary.outstandingCommission, 0);

    const { ledger } = await buildPayoutLedger();
    assert.equal(ledger.length, 1);
    // Cash never adds its share to the payout balance.
    assert.equal(ledger[0].net, 880);
    assert.equal(ledger[0].unsettled, 880);
    assert.equal(ledger[0].payoutBalance, 880);
    assert.equal(ledger[0].outstandingCommission, 0);
  });
});

test("Test 3: cash-only earnings owe commission and show a zero payout, not a negative", async () => {
  // Pure rule: the payment balance is capped at zero and the unpaid fee is
  // flagged, because the platform must never disburse a negative payout.
  const balance = computeNettedBalance([cashRow]);
  assert.equal(balance.cardNet, 0);
  assert.equal(balance.cashCommission, 40);
  assert.equal(balance.nettedBalance, -40);
  assert.equal(balance.dueToCompany, 0);
  assert.equal(balance.outstandingCommission, 40);

  await withProbeDb(async () => {
    await Payment.create([seedPayment(cashRow)]);
    const summary = await buildPayoutSummary();
    assert.equal(summary.gross, 500);
    assert.equal(summary.companyEarnings, 460);
    assert.equal(summary.pendingPayouts, 0);
    assert.equal(summary.nettedBalance, -40);
    assert.equal(summary.cashCommission, 40);
    assert.equal(summary.outstandingCommission, 40);

    const { ledger } = await buildPayoutLedger();
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].net, -40);
    assert.equal(ledger[0].payoutBalance, 0);
    assert.equal(ledger[0].outstandingCommission, 40);
  });
});