import catchAsync from "../utils/catchAsync.js";
import {
  buildPayoutLedger,
  buildPayoutSummary,
  dispatchPayoutBatch,
  settlePayoutBatch,
} from "../services/payoutService.js";

/**
 * Platform-wide commission & settlement KPIs, aggregated live from the real
 * payment ledger (no fabricated metrics).
 */
export const getPayoutSummary = catchAsync(async (req, res, next) => {
  const summary = await buildPayoutSummary();
  res.status(200).json({ status: "success", data: { summary } });
});

/**
 * Per-fleet-operator clearing ledger rows used by the Commissions & Payouts
 * register. Optional ?companyId= narrows to a single partner dossier.
 */
export const getPayoutLedger = catchAsync(async (req, res, next) => {
  const companyId = req.query.companyId || undefined;
  const ledger = await buildPayoutLedger({ companyId });
  res.status(200).json({
    status: "success",
    results: ledger.length,
    data: { ledger },
  });
});

/**
 * Generate the LFB payout-run batch: marks every unsettled COMPLETED payment
 * (optionally for a set of operators) as PROCESSING.
 */
export const generatePayoutBatch = catchAsync(async (req, res, next) => {
  const { companyIds } = req.body ?? {};
  const batch = await dispatchPayoutBatch(companyIds);
  res.status(200).json({ status: "success", data: { batch } });
});

/**
 * Approve & dispatch payouts — settles the full processing queue for a single
 * operator (or all operators when no companyId is supplied).
 */
export const approvePayoutDispatch = catchAsync(async (req, res, next) => {
  const { companyId } = req.body ?? {};
  const result = await settlePayoutBatch(companyId);
  res.status(200).json({ status: "success", data: result });
});