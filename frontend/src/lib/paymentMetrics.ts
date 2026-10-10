import type { AdminPaymentDto } from "../types/admin";

/**
 * Financial KPI derivations for the Payments ledger. All figures come from the
 * real Payment records (status, amount, commissionAmount, companyShare,
 * payoutStatus, timestamps) — nothing is fabricated or extrapolated.
 */

export interface PaymentChannel {
  method: string;
  amount: number;
  pct: number;
}

export interface PaymentMetrics {
  totalCount: number;
  totalAmount: number;
  gross: number;
  grossDelta: number | null;
  successCount: number;
  successRate: number;
  escrowCount: number;
  escrowSum: number;
  escrowOldest: string | null;
  failedCount: number;
  failedSum: number;
  failureRate: number;
  refundedCount: number;
  refundedSum: number;
  channels: PaymentChannel[];
  unsettledShare: number;
  unsettledPartners: number;
  unsettledOldest: string | null;
}

const timestampOf = (p: AdminPaymentDto): string => p.paidAt ?? p.createdAt ?? "";

/** Completed-payment gross within a trailing window [sinceMs, now). */
const grossSince = (payments: AdminPaymentDto[], days: number): number => {
  const from = Date.now() - days * 86400000;
  return payments
    .filter((p) => p.status === "COMPLETED")
    .filter((p) => {
      const at = new Date(timestampOf(p)).getTime();
      return at >= from;
    })
    .reduce((sum, p) => sum + p.amount, 0);
};

/** Completed-payment gross within [untilDays, sinceDays). */
const grossBetween = (
  payments: AdminPaymentDto[],
  sinceDays: number,
  untilDays: number,
): number => {
  const since = Date.now() - sinceDays * 86400000;
  const until = Date.now() - untilDays * 86400000;
  return payments
    .filter((p) => p.status === "COMPLETED")
    .filter((p) => {
      const at = new Date(timestampOf(p)).getTime();
      return at >= until && at < since;
    })
    .reduce((sum, p) => sum + p.amount, 0);
};

const earliestOf = (items: AdminPaymentDto[]): string | null =>
  items.length === 0
    ? null
    : items
        .map(timestampOf)
        .filter(Boolean)
        .sort()
        .slice(0, 1)[0] ?? null;

const pctOf = (part: number, total: number): number =>
  total > 0 ? Math.round((part / total) * 100) : 0;

const shareId = (companyId: AdminPaymentDto["companyId"]): string =>
  typeof companyId === "object" && companyId ? companyId._id ?? "" : (companyId ?? "");

export const buildPaymentMetrics = (
  payments: AdminPaymentDto[],
): PaymentMetrics => {
  const completed = payments.filter((p) => p.status === "COMPLETED");
  const pending = payments.filter((p) => p.status === "PENDING");
  const failed = payments.filter((p) => p.status === "FAILED");
  const refunded = payments.filter((p) => p.status === "REFUNDED");
  const unsettled = payments.filter((p) => p.payoutStatus === "UNSETTLED");

  const gross = completed.reduce((sum, p) => sum + p.amount, 0);
  const currentGross = grossSince(payments, 30);
  const priorGross = grossBetween(payments, 60, 30);
  const grossDelta =
    priorGross > 0
      ? Math.round(((currentGross - priorGross) / priorGross) * 100)
      : null;

  const byMethod = new Map<string, number>();
  completed.forEach((p) => {
    const method = p.paymentMethod ?? "—";
    byMethod.set(method, (byMethod.get(method) ?? 0) + p.amount);
  });
  const channels: PaymentChannel[] = Array.from(byMethod.entries())
    .map(([method, amount]) => ({ method, amount, pct: pctOf(amount, gross) }))
    .sort((a, b) => b.amount - a.amount);

  const partners = new Set(unsettled.map((p) => shareId(p.companyId)).filter(Boolean));

  return {
    totalCount: payments.length,
    totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
    gross,
    grossDelta,
    successCount: completed.length,
    successRate: pctOf(completed.length, payments.length),
    escrowCount: pending.length,
    escrowSum: pending.reduce((sum, p) => sum + p.amount, 0),
    escrowOldest: earliestOf(pending),
    failedCount: failed.length,
    failedSum: failed.reduce((sum, p) => sum + p.amount, 0),
    failureRate: pctOf(failed.length, payments.length),
    refundedCount: refunded.length,
    refundedSum: refunded.reduce((sum, p) => sum + p.amount, 0),
    channels,
    unsettledShare: unsettled.reduce((sum, p) => sum + p.companyShare, 0),
    unsettledPartners: partners.size,
    unsettledOldest: earliestOf(unsettled),
  };
};