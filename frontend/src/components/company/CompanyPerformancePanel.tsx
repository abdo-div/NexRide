import React from "react";
import { useTranslation } from "react-i18next";
import { Star, TrendingUp } from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import type { CompanyDashboardData } from "../../types/companyDashboard";

interface CompanyPerformancePanelProps {
  data: CompanyDashboardData;
}

/**
 * Monthly operational quality panel. The delta, fulfillment/cancellation rates,
 * average booking value and rating all come from the monthly aggregation.
 */
export const CompanyPerformancePanel: React.FC<CompanyPerformancePanelProps> = ({
  data,
}) => {
  const { t } = useTranslation();
  const { performance } = data;

  const deltaLabel =
    performance.bookingsDeltaPct === null
      ? t("company.performance.noBaseline")
      : t("company.performance.vsPrevious", {
          value: performance.bookingsDeltaPct,
        });

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#0B1C30]">{t("company.performance.title")}</h2>
            <span className="text-sm text-[#565E74]">({t("company.performance.titleAr")})</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-bold text-[#2563EB]">
          <TrendingUp className="h-4 w-4" />
          {t("company.performance.tier")}
        </span>
      </div>

      <div className="flex flex-col divide-y divide-[#E5EEFF]">
        {/* Bookings this month */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[#0B1C30]">
              {t("company.performance.bookingsMonth")}
            </span>
            <span className="text-[11px] text-[#565E74]">{deltaLabel}</span>
          </div>
          <span className="text-lg font-extrabold text-[#0B1C30]">
            {t("company.performance.bookingsCount", {
              count: performance.bookingsThisMonth,
            })}
          </span>
        </div>

        {/* Fulfillment rate */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[#0B1C30]">
              {t("company.performance.fulfillment")}
            </span>
            <span className="text-[11px] text-[#565E74]">
              {t("company.performance.fulfillmentHint", {
                completed: performance.completedCount,
              })}
            </span>
          </div>
          <span className="text-lg font-extrabold text-[#2563EB]">
            {performance.fulfillmentRate}%
          </span>
        </div>

        {/* Average booking value */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[#0B1C30]">
              {t("company.performance.avgValue")}
            </span>
            <span className="text-[11px] text-[#565E74]">
              {t("company.performance.avgValueHint")}
            </span>
          </div>
          <span className="font-mono text-lg font-extrabold text-[#0B1C30]">
            {formatLYD(performance.avgBookingValue)} LYD
          </span>
        </div>

        {/* Cancellation rate */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[#0B1C30]">
              {t("company.performance.cancellation")}
            </span>
            <span className="text-[11px] text-[#565E74]">
              {t("company.performance.cancellationHint")}
            </span>
          </div>
          <span className="text-lg font-extrabold text-[#0B1C30]">
            {performance.cancellationRate}%
          </span>
        </div>

        {/* Average customer rating */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[#0B1C30]">
              {t("company.performance.rating")}
            </span>
            <span className="text-[11px] text-[#565E74]">
              {t("company.performance.ratingHint", {
                count: performance.reviews,
              })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-[#F97316] text-[#F97316]" />
            <span className="text-lg font-extrabold text-[#0B1C30]">
              {performance.avgRating > 0
                ? performance.avgRating.toFixed(2)
                : t("company.performance.noRating")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanyPerformancePanel;