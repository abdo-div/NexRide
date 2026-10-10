import React from "react";
import { useTranslation } from "react-i18next";
import { Banknote, Car, Gauge, Wallet } from "lucide-react";
import { AdminKpiCard } from "../admin/AdminKpiCard";
import { formatLYD } from "../../lib/bookingView";
import type { CompanyDashboardData } from "../../types/companyDashboard";

interface CompanyKpiGridProps {
  data: CompanyDashboardData;
}

/**
 * Headline fleet-operator KPI deck. Every figure renders straight from the
 * tenant aggregation — nothing is derived or hard-coded client-side.
 */
export const CompanyKpiGrid: React.FC<CompanyKpiGridProps> = ({ data }) => {
  const { t } = useTranslation();
  const { kpis, fleet, performance } = data;

  const activeFleet = fleet.total - fleet.maintenance;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <AdminKpiCard
        labelKey="company.kpis.totalVehicles"
        icon={Car}
        value={kpis.totalVehicles}
        sub={t("company.kpis.fleetSplit", {
          active: activeFleet,
          shop: fleet.maintenance,
        })}
        progress={fleet.total > 0 ? Math.round((activeFleet / fleet.total) * 100) : 0}
      />
      <AdminKpiCard
        labelKey="company.kpis.activeBookings"
        icon={Gauge}
        value={kpis.onRoad}
        sub={t("company.kpis.onRoadSplit", {
          onRoad: kpis.onRoad,
          upcoming: kpis.upcoming,
        })}
        progress={fleet.utilizationPct}
      />
      <AdminKpiCard
        labelKey="company.kpis.revenueThisMonth"
        icon={Wallet}
        value={formatLYD(kpis.revenueGross)}
        valueSuffix="LYD"
        delta={kpis.revenueDeltaPct}
        deltaNeutralKey="company.kpis.noBaseline"
        sub={t("company.kpis.revenueNet", { value: formatLYD(kpis.revenueNet) })}
      />
      <AdminKpiCard
        labelKey="company.kpis.pendingPayout"
        icon={Banknote}
        tone="emerald"
        value={formatLYD(kpis.pendingPayout)}
        valueSuffix="LYD"
        sub={t("company.kpis.pendingInEscrow", {
          count: kpis.pendingPayoutCount,
        })}
      />

      {/* A11y + context micro-note; the real monthly comparison lives below. */}
      <span className="sr-only">
        {t("company.kpis.monthDelta", {
          value: formatLYD(performance.avgBookingValue),
        })}
      </span>
    </section>
  );
};

export default CompanyKpiGrid;