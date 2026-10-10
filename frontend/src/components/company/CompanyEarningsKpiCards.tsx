import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownRight, ArrowUpRight, Landmark, Minus } from "lucide-react";
import { moneyOf } from "../../lib/companyEarningsView";
import type { CompanyEarningsSummary } from "../../types/companyEarnings";

interface CompanyEarningsKpiCardsProps {
  summary: CompanyEarningsSummary;
  lang: string;
}

const DeltaPill: React.FC<{ delta: number | null; label: string }> = ({
  delta,
  label,
}) => {
  if (delta === null) return null;
  const positive = delta >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        delta === 0
          ? "bg-[#F1F5F9] text-[#64748B]"
          : positive
            ? "bg-emerald-50 text-emerald-700"
            : "bg-[#FFF1F2] text-[#E11D48]"
      }`}
      title={label}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {delta === 0 ? "0%" : `${Math.abs(delta).toFixed(1)}%`}
    </span>
  );
};

/**
 * The four KPI cards of the earnings deck: gross revenue (with the real
 * prior-period growth delta), the NexRide marketplace take, net company
 * earnings, and the pending-escrow balance. Every figure is recomputed live
 * from the tenant's own Payment ledger.
 */
export const CompanyEarningsKpiCards: React.FC<CompanyEarningsKpiCardsProps> = ({
  summary,
}) => {
  const { t } = useTranslation();
  const netPct = summary.gross > 0 ? (summary.companyEarnings / summary.gross) * 100 : 0;

  const periodLabel = t("company.payoutsPage.kpis.deltaLabel");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Gross Revenue */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-bold text-[#565E74]">
            {t("company.payoutsPage.kpis.gross")}
          </span>
          <span className="text-[11px] font-semibold text-[#9AA4B5]">
            {t("company.payoutsPage.kpis.grossAr")}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[26px] font-extrabold tracking-tight text-[#0B1C30]">
            {moneyOf(summary.gross)}
          </span>
          <DeltaPill delta={summary.grossDeltaPct} label={periodLabel} />
        </div>
        <p className="mt-1 text-[12px] text-[#64748B]">
          {summary.bookings === 1
            ? t("company.payoutsPage.kpis.grossSubOne")
            : t("company.payoutsPage.kpis.grossSub", { count: summary.bookings })}
        </p>
      </div>

      {/* NexRide Platform Take */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-bold text-[#565E74]">
            {t("company.payoutsPage.kpis.take")}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t("company.payoutsPage.kpis.live")}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[26px] font-extrabold tracking-tight text-[#0B1C30]">
            {moneyOf(summary.platformTake)}
          </span>
          <span className="inline-flex items-center rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[11px] font-bold text-[#B45309]">
            <Landmark className="me-1 h-3 w-3" aria-hidden="true" />
            {t("company.payoutsPage.kpis.takeTag", {
              rate: summary.effectiveRate.toFixed(1),
            })}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-[#64748B]">
          {t("company.payoutsPage.kpis.takeSub")}
        </p>
      </div>

      {/* Net Company Earnings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-bold text-[#565E74]">
            {t("company.payoutsPage.kpis.net")}
          </span>
          <span className="text-[11px] font-semibold text-[#9AA4B5]">
            {t("company.payoutsPage.kpis.netAr")}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[26px] font-extrabold tracking-tight text-[#0B1C30]">
            {moneyOf(summary.companyEarnings)}
          </span>
          <span className="inline-flex items-center rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[11px] font-bold text-[#2563EB]">
            {t("company.payoutsPage.kpis.netTag", { pct: netPct.toFixed(1) })}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-[#64748B]">
          {t("company.payoutsPage.kpis.netSub")}
        </p>
      </div>

      {/* Pending in Escrow */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-bold text-[#565E74]">
            {t("company.payoutsPage.kpis.escrow")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
            <Minus className="h-3 w-3" aria-hidden="true" />
            {t("company.payoutsPage.kpis.escrowTag")}
          </span>
        </div>
        <div className="mt-2">
          <span className="text-[26px] font-extrabold tracking-tight text-[#0B1C30]">
            {moneyOf(summary.inEscrow)}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-[#64748B]">
          {t("company.payoutsPage.kpis.escrowSub")}
        </p>
      </div>
    </div>
  );
};

export default CompanyEarningsKpiCards;