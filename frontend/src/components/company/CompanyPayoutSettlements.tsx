import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Landmark,
  Lock,
  Send,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { moneyOf } from "../../lib/companyEarningsView";
import type {
  CompanyEarningsSettings,
  CompanyEarningsSummary,
} from "../../types/companyEarnings";

interface CompanyPayoutSettlementsProps {
  summary: CompanyEarningsSummary;
  settings: CompanyEarningsSettings;
  onViewPayouts: () => void;
  onOpenSettings: () => void;
}

/**
 * Payout Settlements — the liquidity split of the current earnings pool:
 * what is wire-able today (unsettled), what sits in escrow awaiting the next
 * cycle, and what has already been disbursed to the company bank. The rail
 * (clearing bank) comes from platform settings, and the "Payouts & Transfers"
 * ledger itself is a parked workspace surfaced as coming soon rather than
 * fabricated.
 */
export const CompanyPayoutSettlements: React.FC<CompanyPayoutSettlementsProps> = ({
  summary,
  settings,
  onViewPayouts,
  onOpenSettings,
}) => {
  const { t } = useTranslation();
  const total = summary.available + summary.inEscrow + summary.disbursed;
  const pct = (value: number) => (total > 0 ? (value / total) * 100 : 0);

  const lanes = [
    {
      label: t("company.payoutsPage.settlements.available"),
      value: moneyOf(summary.available),
      caption: t("company.payoutsPage.settlements.availableSub", {
        bank: settings.clearingBank,
      }),
      cue: "RTGS Ready",
      dot: "bg-emerald-500",
      chip: "bg-emerald-50 text-emerald-700",
      icon: Wallet,
    },
    {
      label: t("company.payoutsPage.settlements.escrow"),
      value: moneyOf(summary.inEscrow),
      caption: t("company.payoutsPage.settlements.escrowSub"),
      cue: t("company.payoutsPage.settlements.escrowTag"),
      dot: "bg-[#F59E0B]",
      chip: "bg-[#FFF4E5] text-[#B45309]",
      icon: Lock,
    },
    {
      label: t("company.payoutsPage.settlements.disbursed"),
      value: moneyOf(summary.disbursed),
      caption: t("company.payoutsPage.settlements.disbursedSub"),
      cue: t("company.payoutsPage.settlements.disbursedTag"),
      dot: "bg-[#2563EB]",
      chip: "bg-[#EFF4FF] text-[#2563EB]",
      icon: Send,
    },
  ];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              <ShieldCheck className="me-1 h-3 w-3" aria-hidden="true" />
              {t("company.payoutsPage.settlements.badge")}
            </span>
          </div>
          <h2 className="mt-2 text-[16px] font-bold text-[#0B1C30]">
            {t("company.payoutsPage.settlements.title")}
          </h2>
          <span className="text-[12px] font-semibold text-[#565E74]">
            {t("company.payoutsPage.settlements.titleAr")}
          </span>
        </div>
        <button
          type="button"
          onClick={onViewPayouts}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1C30] px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[#1A2F43] cursor-pointer"
        >
          <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
          {t("company.payoutsPage.settlements.viewPayouts")}
        </button>
      </div>

      <div className="flex-1 space-y-4 p-5">
        {/* Liquidity split bar */}
        <div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
            <div
              className="bg-emerald-500"
              style={{ width: `${pct(summary.available)}%` }}
            />
            <div
              className="bg-[#F59E0B]"
              style={{ width: `${pct(summary.inEscrow)}%` }}
            />
            <div
              className="bg-[#2563EB]"
              style={{ width: `${pct(summary.disbursed)}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-[#64748B]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {t("company.payoutsPage.settlements.availableShort")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
              {t("company.payoutsPage.settlements.escrowShort")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
              {t("company.payoutsPage.settlements.disbursedShort")}
            </span>
          </div>
        </div>

        {/* Lanes */}
        <div className="space-y-3">
          {lanes.map((lane) => {
            const Icon = lane.icon;
            return (
              <div
                key={lane.label}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-[#F8FAFF] p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#0B1C30] shadow-sm">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-[13px] font-bold text-[#0B1C30]">{lane.label}</span>
                    <span className="text-[15px] font-extrabold tracking-tight text-[#0B1C30]">
                      {lane.value}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-[#64748B]">{lane.caption}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${lane.chip}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${lane.dot}`} />
                      {lane.cue}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="rounded-xl bg-[#F8FAFF] px-4 py-3 text-[11px] font-medium leading-relaxed text-[#64748B]">
          {t("company.payoutsPage.settlements.bankNote", {
            schedule: settings.payoutSchedule,
            bank: settings.clearingBank,
          })}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F1F5F9] px-5 py-3">
        <span className="text-[11px] font-semibold text-[#9AA4B5]">
          {t("company.payoutsPage.settlements.settingsNote")}
        </span>
        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] transition-colors hover:text-[#1D4ED8] cursor-pointer"
        >
          {t("company.payoutsPage.settlements.manage")}
          <ArrowRight className="h-3 w-3 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default CompanyPayoutSettlements;