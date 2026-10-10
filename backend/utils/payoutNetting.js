/**
 * Cash-vs-card payout netting rules.
 *
 * Two rails settle a NexRide booking, and they move money opposite ways:
 *
 *   1. CARD (and any gateway/wallet rail): the *platform* collected the money
 *      (Moamalat capture). The platform owes the company its net share, so a
 *      completed card row ADDS `amount - commissionAmount` (+companyShare) to
 *      the company's payout balance.
 *
 *   2. CASH_ON_DELIVERY (LOCAL gateway): the *company* already holds 100% of
 *      the money collected at the counter. There is nothing for the platform
 *      to pay out - instead the company OWES the platform its commission, so a
 *      completed cash row SUBTRACTS `commissionAmount` from the payout balance.
 *
 * Unsettled balance = SUM(card net earnings) - SUM(cash commissions owed).
 * A negative balance is never paid out: it is displayed as zero with an
 * "outstanding commission" flag instead (see computeNettedBalance).
 *
 * The aggregation expression and the pure JS functions below MUST agree, so a
 * row classified as cash in the chart (JS) subtracts exactly the same amount
 * it does in the payment ledger (aggregation).
 */

const keptOf = (row) => {
  if (row.status === "PARTIALLY_REFUNDED") {
    return (row.amount ?? 0) - (row.refundAmount ?? 0);
  }
  if (row.status === "REFUNDED") return 0;
  return row.amount ?? 0;
};

const fractionOf = (row) => {
  const amount = row.amount ?? 0;
  if (amount <= 0) return 0;
  return keptOf(row) / amount;
};

const round2 = (value) =>
  Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;

/**
 * True for ledger rows that were settled by hand at the counter, so the
 * platform never collected the money. Only the CASH_ON_DELIVERY method uses
 * the LOCAL gateway; every other method flows through a platform rail.
 */
export const isCashPayment = (row) =>
  String(row?.paymentMethod ?? "").toUpperCase() === "CASH_ON_DELIVERY";

/**
 * Signed contribution of one completed ledger row to the company's payout
 * balance (refund-aware: PARTIALLY_REFUNDED scales by kept fraction, REFUNDED
 * contributes nothing):
 *   - cash  -> `-commissionAmount * keptFraction` (company owes the fee)
 *   - other ->  `+companyShare        * keptFraction` (platform owes the share)
 */
export const netContributionOf = (row) => {
  const fraction = fractionOf(row);
  if (isCashPayment(row)) {
    return round2(-(row.commissionAmount ?? 0) * fraction);
  }
  return round2((row.companyShare ?? 0) * fraction);
};

/**
 * Aggregation twin of netContributionOf, embedded in a pipeline as the value
 * of a new field. Self-contained: it derives the kept fraction from `$kept`
 * and `$amount` directly and never references a sibling field, because some
 * MongoDB servers do not resolve fields added earlier in the same $addFields
 * stage. `$kept` itself lives in a previous stage (see the service pipelines).
 */
export const netContributionExpr = {
  $multiply: [
    {
      $cond: [
        { $gt: ["$amount", 0] },
        { $divide: ["$kept", "$amount"] },
        0,
      ],
    },
    {
      $switch: {
        branches: [
          {
            case: { $eq: ["$paymentMethod", "CASH_ON_DELIVERY"] },
            then: { $subtract: [0, { $ifNull: ["$commissionAmount", 0] }] },
          },
        ],
        default: { $ifNull: ["$companyShare", 0] },
      },
    },
  ],
};

/**
 * Fraction of a payment that is still revenue after a refund (kept / amount),
 * for the $addFields stage that runs AFTER the field `kept` has been added.
 */
export const keptFractionExpr = {
  $switch: {
    branches: [
      { case: { $gt: ["$amount", 0] }, then: { $divide: ["$kept", "$amount"] } },
    ],
    default: 0,
  },
};

/**
 * True when the row is cash (company owes commission rather than being owed).
 */
export const isCashExpr = { $eq: ["$paymentMethod", "CASH_ON_DELIVERY"] };

/**
 * A company's total cash commission owed (positive number) across the given
 * refund-aware rows.
 */
export const cashCommissionOwed = (rows = []) =>
  round2(
    rows.reduce((sum, row) => {
      if (!isCashPayment(row)) return sum;
      return sum + (row.commissionAmount ?? 0) * fractionOf(row);
    }, 0),
  );

/**
 * Apply the netting formula to a set of ledger rows:
 *
 *   netted = SUM(card net earnings) - SUM(cash commissions owed)
 *
 * and cap the payable side at zero, flagging the uncovered commission instead
 * so the payout display for a company that owes more than it is owed shows a
 * zero balance plus an "Outstanding Commission" flag rather than a negative.
 */
export const computeNettedBalance = (rows = []) => {
  const { cardNet, cashCommission, netted } = rows.reduce(
    (acc, row) => {
      const net = netContributionOf(row);
      acc.netted += net;
      if (isCashPayment(row)) {
        acc.cashCommission += round2((row.commissionAmount ?? 0) * fractionOf(row));
      } else {
        acc.cardNet += net;
      }
      return acc;
    },
    { cardNet: 0, cashCommission: 0, netted: 0 },
  );

  const nettedBalance = round2(netted);
  return {
    cardNet: round2(cardNet),
    cashCommission: round2(cashCommission),
    nettedBalance,
    dueToCompany: Math.max(0, nettedBalance),
    outstandingCommission: Math.max(0, -nettedBalance),
  };
};

export const meetsMinimumPayout = (balance, minimumPayout) =>
  Number(balance?.dueToCompany ?? 0) > Number(minimumPayout ?? 0);
