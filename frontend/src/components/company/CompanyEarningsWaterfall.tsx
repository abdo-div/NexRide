import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ChevronRight,
  FileText,
  HandCoins,
  Info,
  Landmark,
  Layers,
} from "lucide-react";
import { moneyOf } from "../../lib/companyEarningsView";
import type {
  CompanyEarningsSettings,
  CompanyEarningsSummary,
} from "../../types/companyEarnings";

interface CompanyEarningsWaterfallProps {
  summary: CompanyEarningsSummary;
  settings: CompanyEarningsSettings;
  onPolicy: () => void;
}

const StepTitles = [
  { key: "customerPaid", icon: HandCoins },
  { key: "marketplaceFee", icon: Landmark },
  { key: "companyTake", icon: Layers },
  { key: "liquiditySplit", icon: FileText },
] as const;

/**
 * Settlement Flow Architecture — a transparent four-step breakdown of how a
 * booking's cash becomes the company's net take and splits into available vs
 * escrow liquidity. All figures are the live deck values; the rail description
 * comes from the platform registry (schedule + clearing bank), never hardcoded.
 */
export const CompanyEarningsWaterfall: React.FC<CompanyEarningsWaterfallProps> = ({
  summary,
  settings,
  onPolicy,
}) => {
  const { t } = useTranslation();
  const netPct = summary.gross > 0 ? (summary.companyEarnings / summary.gross) * 100 : 0;

  const steps = [
    {
      title: t("company.payoutsPage.waterfall.step1Title"),
      tag: t("company.payoutsPage.waterfall.tagGross"),
      sub: t("company.payoutsPage.waterfall.step1Sub"),
      value: moneyOf(summary.gross),
      icon: StepTitles[0].icon,
    },
    {
      title: t("company.payoutsPage.waterfall.step2Title"),
      tag: t("company.payoutsPage.waterfall.tagFee", {
        rate: summary.effectiveRate.toFixed(1),
      }),
      sub: t("company.payoutsPage.waterfall.step2Sub"),
      value: `-${moneyOf(summary.platformTake)}`,
      icon: StepTitles[1].icon,
    },
    {
      title: t("company.payoutsPage.waterfall.step3Title"),
      tag: t("company.payoutsPage.waterfall.tagNet", { pct: netPct.toFixed(1) }),
      sub: t("company.payoutsPage.waterfall.step3Sub"),
      value: moneyOf(summary.companyEarnings),
      icon: StepTitles[2].icon,
    },
    {
      title: t("company.payoutsPage.waterfall.step4Title"),
      tag: t("company.payoutsPage.waterfall.tagSplit"),
      sub: t("company.payoutsPage.waterfall.step4Sub", {
        schedule: settings.payoutSchedule,
      }),
      value: moneyOf(summary.available + summary.inEscrow),
      icon: StepTitles[3].icon,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
              <Info className="me-1 h-3 w-3" aria-hidden="true" />
              {t("company.payoutsPage.waterfall.badge")}
            </span>
          </div>
          <h2 className="mt-2 text-[16px] font-bold text-[#0B1C30]">
            {t("company.payoutsPage.waterfall.title")}
          </h2>
          <span className="text-[12px] font-semibold text-[#565E74]">
            {t("company.payoutsPage.waterfall.titleAr")}
          </span>
        </div>
        <button
          type="button"
          onClick={onPolicy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F1F5F9] px-3 py-2 text-[12px] font-bold text-[#565E74] transition-colors hover:bg-[#E5EEFF] hover:text-[#0B1C30] cursor-pointer"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          {t("company.payoutsPage.waterfall.policy")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-y-3 p-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-0">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="relative flex gap-3 rounded-xl border border-slate-100 bg-[#F8FAFF] p-4 xl:border-0 xl:bg-transparent xl:p-0 xl:px-3"
            >
              {index < steps.length - 1 && (
                <span className="absolute end-0 top-1/2 hidden -translate-y-1/2 translate-x-1/2 text-[#C7D2FE] xl:inline-flex">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-sm">
                <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] font-bold text-[#0B1C30]">{step.title}</span>
                  <span className="inline-flex items-center rounded-full bg-[#E5EEFF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                    {step.tag}
                  </span>
                </div>
                <p className="mt-1 text-[22px] font-extrabold tracking-tight text-[#0B1C30]">
                  {step.value}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[#64748B]">
                  {step.sub}
                  {index === 3 && (
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#434655]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                        {t("company.payoutsPage.waterfall.available")} ·{" "}
                        {moneyOf(summary.available)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[#B45309]">
                        {t("company.payoutsPage.waterfall.escrow")} ·{" "}
                        {moneyOf(summary.inEscrow)}
                      </span>
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-[#F1F5F9] px-5 py-3">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9AA4B5]">
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          {t("company.payoutsPage.waterfall.rail", {
            bank: settings.clearingBank,
            schedule: settings.payoutSchedule,
          })}
        </span>
      </div>
    </div>
  );
};

export default CompanyEarningsWaterfall;