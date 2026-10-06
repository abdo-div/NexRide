import React from "react";
import { useTranslation } from "react-i18next";
import { Info, TrendingUp } from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import type {
  CompanyEarningsChart as CompanyEarningsChartData,
  EarningsChartRange,
} from "../../types/companyEarnings";

const CHART_RANGE_OPTIONS: { value: EarningsChartRange; labelKey: string }[] = [
  { value: "7d", labelKey: "company.payoutsPage.chart.tab7d" },
  { value: "30d", labelKey: "company.payoutsPage.chart.tab30d" },
  { value: "3m", labelKey: "company.payoutsPage.chart.tab3m" },
  { value: "12m", labelKey: "company.payoutsPage.chart.tab12m" },
];

const CHART_HEIGHT = 208;

interface CompanyEarningsChartProps {
  chart: CompanyEarningsChartData;
  chartRange: EarningsChartRange;
  onChartRangeChange: (range: EarningsChartRange) => void;
  loading: boolean;
}

/**
 * Revenue Overview & Trends — a true stacked-bar decomposition (Net on the
 * bottom, Marketplace Fee stacked above; the two always sum to Gross). The tab
 * re-fetches a fresh trailing window from the ledger independently of the deck
 * range, and the footnote reports the genuinely best interval plus the real
 * average daily take.
 */
export const CompanyEarningsChart: React.FC<CompanyEarningsChartProps> = ({
  chart,
  chartRange,
  onChartRangeChange,
  loading,
}) => {
  const { t } = useTranslation();
  const buckets = chart.buckets;
  const maxGross = Math.max(1, ...buckets.map((bucket) => bucket.gross));

  const footnotes = [
    chart.topWindow
      ? t("company.payoutsPage.chart.topWindow", {
          label: chart.topWindow.label,
          amount: `${formatLYD(chart.topWindow.gross)} LYD`,
        })
      : t("company.payoutsPage.chart.noTop"),
    t("company.payoutsPage.chart.avgTake", {
      amount: `${formatLYD(chart.avgTakePerDay)} LYD`,
    }),
  ];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-bold text-[#0B1C30]">
            {t("company.payoutsPage.chart.title")}
          </h2>
          <span className="text-[12px] font-semibold text-[#565E74]">
            {t("company.payoutsPage.chart.titleAr")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#F1F5F9] p-1">
          {CHART_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={loading}
              onClick={() => onChartRangeChange(option.value)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
                chartRange === option.value
                  ? "bg-white text-[#0B1C30] shadow-sm"
                  : "text-[#64748B] hover:text-[#0B1C30]"
              }`}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4 text-[11px] font-bold text-[#565E74]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[4px] bg-[#2563EB]" />
          {t("company.payoutsPage.chart.legendNet")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[4px] bg-[#F59E0B]" />
          {t("company.payoutsPage.chart.legendFee")}
        </span>
        <span className="mr-auto inline-flex items-center gap-1.5 text-[#0B1C30]">
          <span className="h-2.5 w-2.5 rounded-[4px] bg-[#0B1C30]" />
          {t("company.payoutsPage.chart.legendGross")}
        </span>
      </div>

      <div className="mt-4 flex flex-1 items-end gap-2 sm:gap-3">
        {buckets.length === 0 && (
          <div className="flex h-full w-full items-center justify-center text-[12px] font-semibold text-[#9AA4B5]">
            {t("company.payoutsPage.chart.empty")}
          </div>
        )}
        {buckets.map((bucket) => {
          const netHeight = Math.max(2, (bucket.net / maxGross) * CHART_HEIGHT);
          const feeHeight = Math.max(0, (bucket.fee / maxGross) * CHART_HEIGHT);
          return (
            <div
              key={bucket.key}
              className="group flex min-w-0 flex-1 flex-col items-center gap-1.5"
              title={`${bucket.label} — ${t("company.payoutsPage.chart.legendGross")} ${formatLYD(bucket.gross)} LYD · ${t("company.payoutsPage.chart.legendFee")} ${formatLYD(bucket.fee)} LYD · ${t("company.payoutsPage.chart.legendNet")} ${formatLYD(bucket.net)} LYD`}
            >
              <div
                className="flex w-full max-w-12 flex-col justify-end"
                style={{ height: CHART_HEIGHT }}
              >
                <div
                  className="w-full rounded-t-[4px] bg-[#F59E0B] transition-opacity group-hover:opacity-80"
                  style={{ height: feeHeight }}
                />
                <div
                  className="w-full rounded-b-[4px] bg-[#2563EB] transition-opacity group-hover:opacity-80"
                  style={{ height: netHeight }}
                />
              </div>
              <span className="max-w-14 truncate text-center text-[10px] font-semibold text-[#64748B]">
                {bucket.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#F1F5F9] pt-3">
        <TrendingUp className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden="true" />
        <p className="text-[11px] font-medium leading-snug text-[#64748B]">
          {footnotes.join(" · ")}
        </p>
        <span className="ms-auto inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#9AA4B5]">
          <Info className="h-3 w-3" aria-hidden="true" />
          {t("company.payoutsPage.chart.hint")}
        </span>
      </div>
    </div>
  );
};

export default CompanyEarningsChart;