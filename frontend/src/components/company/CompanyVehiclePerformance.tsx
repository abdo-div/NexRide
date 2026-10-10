import React from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp } from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import type { CompanyVehicleData } from "../../types/companyVehicle";
import { SectionCard } from "./CompanyVehicleBits";

interface CompanyVehiclePerformanceProps {
  data: CompanyVehicleData;
}

/**
 * Business performance bento — every figure is computed from the vehicle's
 * own booking ledger (revenue, utilization over the last 30 days, booking
 * buckets and the real rental average rating). No "vs last month" deltas are
 * fabricated.
 */
export const CompanyVehiclePerformance: React.FC<CompanyVehiclePerformanceProps> = ({
  data,
}) => {
  const { t } = useTranslation();
  const { vehicle, metrics } = data;

  const tiles = [
    {
      label: t("company.vehiclePage.perf.revenue"),
      icon: TrendingUp,
      main: `${formatLYD(metrics.financial.revenue)} LYD`,
      sub: t("company.vehiclePage.perf.settled", { trips: metrics.financial.trips }),
    },
    {
      label: t("company.vehiclePage.perf.util"),
      main: `${metrics.utilization.pct}%`,
      sub: t("company.vehiclePage.perf.utilHint", {
        days: metrics.utilization.daysRented,
        window: metrics.utilization.windowDays,
      }),
    },
    {
      label: t("company.vehiclePage.perf.bookings"),
      main: String(metrics.bookings.total),
      sub: t("company.vehiclePage.perf.bookingsHint", {
        completed: metrics.bookings.completed,
        upcoming: metrics.bookings.upcoming,
      }),
    },
    {
      label: t("company.vehiclePage.perf.rating"),
      main:
        vehicle.rating.average !== null
          ? vehicle.rating.average.toFixed(2)
          : "—",
      sub: t("company.vehiclePage.perf.ratingHint", { count: vehicle.rating.count }),
    },
  ];

  return (
    <SectionCard
      icon={TrendingUp}
      title={t("company.vehiclePage.perf.title")}
      titleAr={t("company.vehiclePage.perf.titleAr")}
    >
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl bg-[#F1F5F9] p-4">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              {tile.label}
            </span>
            <p className="mt-1 text-[22px] font-extrabold tracking-tight text-[#0B1C30]">
              {tile.main}
            </p>
            <p className="mt-0.5 text-[11px] text-[#565E74]">{tile.sub}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

export default CompanyVehiclePerformance;