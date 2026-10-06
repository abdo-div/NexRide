import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp } from "lucide-react";
import type { CompanyReviewTrendDatum } from "../../types/companyReviews";

type RangeKey = "30d" | "3m" | "6m" | "12m";

const WINDOW: Record<RangeKey, number> = {
  "30d": 2,
  "3m": 3,
  "6m": 6,
  "12m": 12,
};

const RANGE_KEYS: RangeKey[] = ["30d", "3m", "6m", "12m"];

const monthLabel = (lang: string, year: number, month: number): string =>
  new Intl.DateTimeFormat(lang, { month: "short" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );

interface CompanyRatingTrendProps {
  trend: CompanyReviewTrendDatum[];
  lang: string;
  total: number;
}

/**
 * Monthly rating trend charts. The 30d/3m/6m/12m switcher slices the real,
 * zero-filled 12-month trend; each bar is sized by review count and carries
 * its month's average as tooltip.
 */
export const CompanyRatingTrend: React.FC<CompanyRatingTrendProps> = ({
  trend,
  lang,
  total,
}) => {
  const { t } = useTranslation();
  const [range, setRange] = useState<RangeKey>("6m");

  const window = WINDOW[range];
  const windowData = trend.slice(-window).map((datum) => ({
    ...datum,
    label: monthLabel(lang, datum.year, datum.month),
  }));

  const maxCount = windowData.reduce((max, d) => Math.max(max, d.count), 0);

  const rangeLabel = (key: RangeKey): string =>
    key === "30d"
      ? t("company.reviewsPage.trend.range30")
      : key === "3m"
        ? t("company.reviewsPage.trend.range3m")
        : key === "6m"
          ? t("company.reviewsPage.trend.range6m")
          : t("company.reviewsPage.trend.range12m");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#0B1C30]">
            {t("company.reviewsPage.trend.title")}
          </h2>
          <p className="text-[12px] font-semibold text-[#565E74]">
            {t("company.reviewsPage.trend.titleAr")}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-[#F1F5F9] p-1">
          {RANGE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors cursor-pointer ${
                range === key
                  ? "bg-white text-[#2563EB] shadow-sm"
                  : "text-[#565E74] hover:text-[#0B1C30]"
              }`}
            >
              {rangeLabel(key)}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-6">
        {windowData.length === 0 || maxCount === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8FAFC] text-[#9AA4B5]">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-[#64748B]">
              {t("company.reviewsPage.trend.reviews", { count: total })}
            </p>
            <p className="text-[12px] text-[#9AA4B5]">
              {t("company.reviewsPage.trend.empty")}
            </p>
          </div>
        ) : (
          <>
            <div className="flex h-40 items-end gap-3 sm:gap-5">
              {windowData.map((datum) => {
                const height =
                  maxCount > 0 ? Math.max((datum.count / maxCount) * 100, datum.count > 0 ? 6 : 2) : 0;
                return (
                  <div
                    key={datum.key}
                    className="group flex flex-1 flex-col items-center gap-2"
                    title={`${datum.label} · ${t("company.reviewsPage.trend.reviews", {
                      count: datum.count,
                    })}${datum.avg !== null ? ` · ${datum.avg.toFixed(1)}/5` : ""}`}
                  >
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={`w-full rounded-t-lg transition-all ${
                          datum.count > 0 ? "bg-gradient-to-t from-[#2563EB] to-[#60A5FA]" : "bg-[#E2E8F0]"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="whitespace-nowrap text-[11px] font-bold text-[#565E74]">
                      {datum.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[12px] text-[#9AA4B5]">
              {t("company.reviewsPage.trend.consistency")}
            </p>
          </>
        )}
      </div>
    </section>
  );
};

export default CompanyRatingTrend;