import React from "react";
import { useTranslation } from "react-i18next";
import { Banknote, CalendarClock, ShieldAlert, Siren, Sparkles } from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import type { MaintenanceSummary } from "../../types/admin";

interface CompanyMaintenanceKpiCardsProps {
  summary: MaintenanceSummary | null;
}

const formatCount = (value: number): string =>
  new Intl.NumberFormat("en-US").format(Math.round(value));

/**
 * Four live KPI tiles (mirrors the Maintenance & Inspection sheet). Three are
 * real summary figures; "Due for Inspection" has no model yet, so it shows a
 * coming-soon state instead of inventing data.
 */
export const CompanyMaintenanceKpiCards: React.FC<CompanyMaintenanceKpiCardsProps> = ({
  summary,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiTile
        label={t("company.maintenance.kpis.inService")}
        icon={<Siren className="h-[18px] w-[18px]" />}
        iconTone="bg-[#E5EEFF] text-[#2563EB]"
        value={summary ? formatCount(summary.inServiceVehicles) : "—"}
        suffix={t("company.maintenance.kpis.units")}
        sub={
          summary
            ? t("company.maintenance.kpis.inServiceSub", {
                inProgress: formatCount(summary.inProgress),
                quarantined: formatCount(summary.quarantinedUnits),
              })
            : t("company.maintenance.kpis.loading")
        }
        progress={summary?.inServicePct ?? 0}
        barTone="bg-[#2563EB]"
      />
      <KpiTile
        label={t("company.maintenance.kpis.dueInspection")}
        icon={<Sparkles className="h-[18px] w-[18px]" />}
        iconTone="bg-[#F1F5F9] text-[#64748B]"
        value="—"
        suffix=""
        sub={
          <span className="inline-flex items-center gap-1.5">
            {t("company.maintenance.kpis.soon")}
            <span className="rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#2563EB]">
              {t("company.maintenance.soon")}
            </span>
          </span>
        }
        progress={0}
        barTone="bg-[#CBD5E1]"
      />
      <KpiTile
        label={t("company.maintenance.kpis.upcoming")}
        icon={<CalendarClock className="h-[18px] w-[18px]" />}
        iconTone="bg-slate-100 text-slate-600"
        value={summary ? formatCount(summary.scheduledNext7d) : "—"}
        suffix={t("company.maintenance.kpis.units")}
        sub={
          summary
            ? t("company.maintenance.kpis.upcomingSub", {
                monthLabel: summary.monthLabel,
              })
            : t("company.maintenance.kpis.loading")
        }
        progress={100}
        barTone="bg-slate-400"
      />
      <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-[#0B1C30] to-[#10263F] p-4 text-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">
            {t("company.maintenance.kpis.mtd")}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <Banknote className="h-[18px] w-[18px] text-emerald-300" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-extrabold tracking-tight">
            {summary ? formatLYD(summary.mtdCost) : "—"}
          </span>
          <span className="text-xs font-bold text-emerald-300">LYD</span>
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {summary
            ? t("company.maintenance.kpis.mtdSub", {
                monthLabel: summary.monthLabel,
                avg: formatCount(Math.round(summary.avgCostPerVehicle)),
              })
            : t("company.maintenance.kpis.loading")}
        </div>
        {summary && summary.overdueCount > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1 text-[11px] font-bold text-red-200">
            <ShieldAlert className="h-3.5 w-3.5" />
            {t("company.maintenance.kpis.overdueLock", {
              count: formatCount(summary.overdueCount),
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface KpiTileProps {
  label: string;
  icon: React.ReactNode;
  iconTone: string;
  value: string;
  suffix: string;
  sub: React.ReactNode;
  progress: number;
  barTone: string;
  pulse?: boolean;
}

const KpiTile: React.FC<KpiTileProps> = ({
  label,
  icon,
  iconTone,
  value,
  suffix,
  sub,
  progress,
  barTone,
  pulse,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-[#565E74]">{label}</span>
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconTone}`}>
        {icon}
      </span>
    </div>
    <div className={`mt-2 flex items-baseline gap-1 ${pulse ? "animate-pulse" : ""}`}>
      <span className="text-2xl font-extrabold tracking-tight text-[#0B1C30]">{value}</span>
      {suffix && <span className="text-xs font-bold text-[#565E74]">{suffix}</span>}
    </div>
    <div className="mt-1 text-xs text-[#565E74]">{sub}</div>
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#EFF4FF]">
      <div
        className={`h-full rounded-full ${barTone} transition-all`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  </div>
);

export default CompanyMaintenanceKpiCards;