import type { AdminPayoutRow } from "../types/admin";

/**
 * Derived payout-run code for a fleet operator's settlement row, e.g.
 * PO-XXXXXXXX where the suffix comes from the real company ObjectId. No
 * fabricated sequential counters — the code is deterministic from the data.
 */
export const payoutCodeOf = (row: AdminPayoutRow): string =>
  `PO-${(row.companyId ?? "").slice(-6).toUpperCase()}`;

/**
 * Deterministic LFB batch reference shown in the dossier header, derived from
 * the operator's real id.
 */
export const lfbBatchRefOf = (row: AdminPayoutRow): string =>
  `LFB-RTGS-${(row.companyId ?? "").slice(-6).toUpperCase()}-LY`;

/** Amount still owed to the operator (unsettled + dispatched queue). */
export const pendingAmountOf = (row: AdminPayoutRow): number =>
  row.unsettled + row.processing;

/** Effective take-rate for a ledger row (aggregate, from real ledger sums). */
export const effectiveRateOf = (row: AdminPayoutRow): number =>
  row.gross > 0 ? (row.fee / row.gross) * 100 : 0;

export const rowCompanyIdOf = (row: AdminPayoutRow): string =>
  row.companyId ?? row.company?._id ?? "";

/** Locale-aware full-name resolver for populated/unpopulated payment refs. */
export const idOf = (value: unknown): string =>
  typeof value === "object" && value
    ? (value as { _id?: string })._id ?? ""
    : ((value ?? "") as string);