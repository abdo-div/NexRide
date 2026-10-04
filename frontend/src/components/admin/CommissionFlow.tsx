import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  CircleCheck,
  Landmark,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import type { AdminPayoutSummary } from "../../types/admin";
import { formatLYD } from "../../lib/bookingView";

export interface CommissionFlowProps {
  summary: AdminPayoutSummary | null;
}

/**
 * "Capital Settlement Architecture" — live flow from marketplace GMV down to
 * fleet settlement payouts. Every figure / percentage is computed from the real
 * payout summary aggregation, never mocked.
 */
export const CommissionFlow: React.FC<CommissionFlowProps> = ({ summary }) => {
  const { t } = useTranslation();

  const gross = summary?.gross ?? 0;
  const take = summary?.platformTake ?? 0;
  const share = summary?.companyEarnings ?? 0;
  const paid = summary?.paidPayouts ?? 0;
  const pending = summary?.pendingPayouts ?? 0;
  const rate = summary?.effectiveRate ?? 0;
  const paidPct = gross > 0 ? Math.min(100, (paid / gross) * 100) : 0;
  const liquidatable = paid + pending;
  const fillPct = (value: number) =>
    liquidatable > 0 ? Math.max(8, Math.min(100, (value / liquidatable) * 100)) : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-[#08131F] via-[#0B1C30] to-[#10263F] p-6 text-white shadow-[0_18px_50px_-16px_rgba(8,19,31,0.55)]">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#2563EB]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <div className="text-sm font-extrabold tracking-tight text-white">
            {t("admin.commissions.flow.title")}
          </div>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
            <ShieldCheck className="h-3 w-3" />
            {t("admin.commissions.flow.verifiedChip")}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-300">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1">
            <Landmark className="h-3 w-3 text-[#93C5FD]" />
            {t("admin.commissions.flow.railLabel")}
          </span>
          <span className="text-slate-500">
            {t("admin.commissions.count", { count: summary?.activeRuns ?? 0 })}
          </span>
        </div>
      </div>

      <div className="relative mt-6 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        {/* Node 1 — GMV */}
        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/50 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#93C5FD]">
              <Smartphone className="h-3.5 w-3.5" />
              {t("admin.commissions.flow.gmvBadge")}
            </span>
            <span className="rounded-md bg-[#2563EB]/20 px-2 py-0.5 font-mono text-[11px] font-bold text-[#93C5FD]">
              {t("admin.commissions.flow.gmvPct")}
            </span>
          </div>
          <div className="mt-3 text-2xl font-extrabold tracking-tight text-white">
            {formatLYD(gross)}
            <span className="ms-1 text-xs font-semibold text-slate-400">LYD</span>
          </div>
          <div className="mt-1 truncate text-[11px] text-slate-400">
            {t("admin.commissions.flow.gmvSub")}
          </div>
        </div>

        <div className="flex items-center justify-center lg:flex-col">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-[#93C5FD] shadow-lg">
            <ArrowDown className="h-4 w-4" />
          </span>
          <span className="mt-1 hidden h-4 w-px bg-slate-700 lg:block" />
        </div>

        {/* Node 2 — split */}
        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/50 p-5 backdrop-blur">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#FBBF24]">
            {t("admin.commissions.flow.splitTitle")}
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="text-lg font-extrabold tracking-tight text-white">
              {formatLYD(take)}
            </div>
            <div className="text-right text-[11px] font-semibold text-slate-300">
              {t("admin.commissions.flow.splitRate", {
                rate: rate.toFixed(1),
                share: (100 - rate).toFixed(1),
              })}
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#93C5FD]">
                  {t("admin.commissions.flow.feeLabel", { rate: rate.toFixed(1) })}
                </span>
                <span className="font-bold text-white">{formatLYD(take)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-700/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA]"
                  style={{ width: `${rate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-emerald-300">
                  {t("admin.commissions.flow.partnerLabel", {
                    share: (100 - rate).toFixed(1),
                  })}
                </span>
                <span className="font-bold text-white">{formatLYD(share)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-700/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                  style={{ width: `${100 - rate}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 text-[11px] text-slate-400">
            {t("admin.commissions.flow.splitSub")}
          </div>
        </div>
      </div>

      {/* Node 3 — fleet settlement payouts */}
      <div className="relative mt-4 rounded-2xl border border-slate-700/70 bg-slate-800/50 p-5 backdrop-blur">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#34D399]">
              <Wallet className="h-3.5 w-3.5" />
              {t("admin.commissions.flow.liquidityTitle")}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-white">
                {t("admin.commissions.flow.liquidityPct", { pct: paidPct.toFixed(0) })}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {t("admin.commissions.flow.disbursalSub")}
              </span>
            </div>
          </div>
          <div className="flex min-w-[240px] flex-col gap-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-300">
                <CircleCheck className="h-3.5 w-3.5" />
                {t("admin.commissions.flow.paid")}
              </span>
              <span className="font-bold text-white">{formatLYD(paid)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-300">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-amber-400" />
                {t("admin.commissions.flow.pending")}
              </span>
              <span className="font-bold text-white">{formatLYD(pending)}</span>
            </div>
            <div className="mt-0.5 flex h-2 w-full gap-1 overflow-hidden rounded-full bg-slate-700/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                style={{ width: `${fillPct(paid)}%` }}
              />
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                style={{ width: `${fillPct(pending)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionFlow;