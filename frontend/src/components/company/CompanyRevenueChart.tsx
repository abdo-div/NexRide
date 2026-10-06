import React from "react";
import { useTranslation } from "react-i18next";
import { formatLYD } from "../../lib/bookingView";
import type {
  CompanyDashboardData,
  CompanyDashboardPeriod,
} from "../../types/companyDashboard";

const COMPANY_PERIODS: CompanyDashboardPeriod[] = ["7d", "30d", "3m", "12m"];

const W = 700;
const H = 240;
const LEFT = 40;
const RIGHT = 670;
const TOP = 20;
const BOTTOM = 200;
const X_LABEL_Y = 224;

const compact = (value: number, lang: string): string =>
  new Intl.NumberFormat(lang, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

interface CompanyRevenueChartProps {
  data: CompanyDashboardData;
  period: CompanyDashboardPeriod;
  onPeriodChange: (period: CompanyDashboardPeriod) => void;
  lang: string;
}

/**
 * Gross vs Net revenue grouped-bar chart from the aggregated series. The gross
 * and net figures are the actual bucketed ledger totals, never a projection,
 * and the period filter is forwarded to the backend as-is.
 */
export const CompanyRevenueChart: React.FC<CompanyRevenueChartProps> = ({
  data,
  period,
  onPeriodChange,
  lang,
}) => {
  const { t } = useTranslation();
  const points = data.revenueSeries;

  const grossTotal = points.reduce((acc, p) => acc + p.gross, 0);
  const netTotal = points.reduce((acc, p) => acc + p.net, 0);

  const maxValue = points.reduce(
    (acc, p) => Math.max(acc, p.gross, p.net),
    0,
  );

  if (maxValue <= 0 || points.length === 0) {
    return (
      <div className="flex w-full flex-col gap-4 rounded-xl bg-[#F8FAFC] p-4">
        <div className="flex items-center justify-between text-sm text-[#565E74]">
          <span>{t("company.chart.header.legend")}</span>
        </div>
        <div className="flex h-56 w-full items-center justify-center rounded-xl bg-white text-sm text-[#64748B]">
          {t("company.chart.empty")}
        </div>
      </div>
    );
  }

  const n = points.length;
  const slot = (RIGHT - LEFT) / n;
  const barW = Math.min(22, Math.max(8, slot * 0.28));
  const barGap = 6;

  const y = (value: number): number =>
    BOTTOM - (value / maxValue) * (BOTTOM - TOP);

  const gridValue = (k: number): number => maxValue * (1 - k / 4);
  const stepIndex = points.length <= 8 ? 1 : Math.ceil(points.length / 6);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter segmented control */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#565E74]">
          {t("company.chart.seriesTitle")}
        </span>
        <div className="inline-flex rounded-xl bg-[#E5EEFF] p-1">
          {COMPANY_PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPeriodChange(p)}
              className={`rounded-lg px-3 py-1 text-xs font-bold cursor-pointer transition-all ${
                period === p
                  ? "bg-white text-[#2563EB] shadow-sm"
                  : "text-[#434655] hover:text-[#0B1C30]"
              }`}
            >
              {t(`company.chart.period.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex w-full flex-col rounded-xl bg-[#E5EEFF]/60 p-4">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-[#565E74]">
            {t("company.chart.periodLabel", { count: n })}
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-semibold text-[#0B1C30]">
              <span className="h-3 w-3 rounded-sm bg-[#2563EB]" />
              {t("company.chart.legendGross")}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-[#434655]">
              <span className="h-3 w-3 rounded-sm bg-[#D3E4FE]" />
              {t("company.chart.legendNet")}
            </span>
          </div>
        </div>

        <div className="h-56 w-full pt-2">
          <svg
            className="h-full w-full overflow-visible"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={t("company.chart.ariaLabel")}
            preserveAspectRatio="none"
          >
            {/* Horizontal grid guides */}
            {[0, 1, 2, 3, 4].map((k) => {
              const gy = TOP + k * ((BOTTOM - TOP) / 4);
              return (
                <g key={k}>
                  <line
                    x1={LEFT}
                    x2={RIGHT}
                    y1={gy}
                    y2={gy}
                    stroke="#FFFFFF"
                    strokeWidth={k === 4 ? 1 : 1}
                    strokeDasharray={k === 4 ? undefined : "4 4"}
                  />
                  <text
                    x={LEFT - 6}
                    y={gy + 4}
                    textAnchor="end"
                    fontSize="10"
                    fontWeight="bold"
                    fill="#565E74"
                  >
                    {compact(gridValue(k), lang)}
                  </text>
                </g>
              );
            })}

            {/* Grouped bars: gross then net */}
            {points.map((p, i) => {
              const cx = LEFT + slot * i + slot / 2;
              const gY = y(p.gross);
              const nY = y(p.net);
              return (
                <g key={i}>
                  <rect
                    x={cx - barGap - barW}
                    y={gY}
                    width={barW}
                    height={BOTTOM - gY}
                    rx="3"
                    fill="#2563EB"
                  />
                  <rect
                    x={cx}
                    y={nY}
                    width={barW}
                    height={BOTTOM - nY}
                    rx="3"
                    fill="#D3E4FE"
                  />
                </g>
              );
            })}

            {/* X-axis labels */}
            {points.map((p, i) => {
              if (i % stepIndex !== 0 && i !== points.length - 1) return null;
              return (
                <text
                  key={i}
                  x={LEFT + slot * i + slot / 2}
                  y={X_LABEL_Y}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="#434655"
                >
                  {p.label}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Legend summary line */}
        <div className="mt-2 flex items-center justify-between border-t border-[#C3C6D7]/60 pt-2 text-xs text-[#565E74]">
          <span>
            {t("company.chart.totalsGross", { value: formatLYD(grossTotal) })}
          </span>
          <span className="font-semibold text-[#2563EB]">
            {t("company.chart.totalsNet", { value: formatLYD(netTotal) })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CompanyRevenueChart;