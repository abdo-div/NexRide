import React from "react";
import { useTranslation } from "react-i18next";
import type { CompanyDashboardData } from "../../types/companyDashboard";

interface CompanyFleetStatusProps {
  data: CompanyDashboardData;
}

const pct = (part: number, whole: number): number =>
  whole > 0 ? (part / whole) * 100 : 0;

/**
 * Fleet-status breakdown: a segmented posture bar plus the classic legend rows.
 * All counts and percentages are derived live from the aggregation response.
 */
export const CompanyFleetStatus: React.FC<CompanyFleetStatusProps> = ({
  data,
}) => {
  const { t } = useTranslation();
  const fleet = data.fleet;
  const total = fleet.total;
  const unpublished = Math.max(0, total - fleet.published);

  const segments = [
    {
      labelKey: "company.fleet.available",
      hintKey: "company.fleet.readyHint",
      value: fleet.available,
      bar: "bg-[#2563EB]",
      dot: "bg-[#2563EB]",
    },
    {
      labelKey: "company.fleet.onRoad",
      hintKey: "company.fleet.onRoadHint",
      value: fleet.onRoad,
      bar: "bg-[#004AC6]",
      dot: "bg-[#004AC6]",
      accent: true,
    },
    {
      labelKey: "company.fleet.maintenance",
      hintKey: "company.fleet.maintenanceHint",
      value: fleet.maintenance,
      bar: "bg-[#FFB690]",
      dot: "bg-[#FFB690]",
    },
    {
      labelKey: "company.fleet.unpublished",
      hintKey: "company.fleet.unpublishedHint",
      value: unpublished,
      bar: "bg-[#C3C6D7]",
      dot: "bg-[#C3C6D7]",
    },
  ];

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#0B1C30]">{t("company.fleet.title")}</h2>
            <span className="text-sm text-[#565E74]">({t("company.fleet.titleAr")})</span>
          </div>
        </div>
        <span className="rounded-full bg-[#E5EEFF] px-3 py-1 text-sm font-bold text-[#2563EB]">
          {t("company.fleet.total", { count: total })}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-[#E5EEFF]">
          {segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div
                key={s.labelKey}
                className={`h-full ${s.bar} transition-all`}
                style={{ width: `${pct(s.value, total)}%` }}
                title={`${t(s.labelKey)}: ${s.value}`}
              />
            ))}
        </div>
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#565E74]">
          <span>{t("company.fleet.depot", { city: data.company?.city ?? "" })}</span>
          <span className="text-[#2563EB]">
            {t("company.fleet.utilization", {
              value: fleet.utilizationPct,
            })}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {segments.map((s) => (
          <div
            key={s.labelKey}
            className="flex items-center justify-between rounded-xl bg-[#E5EEFF] px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <span className={`h-3 w-3 shrink-0 rounded-full ${s.dot}`} />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[#0B1C30]">{t(s.labelKey)}</span>
                <span className="text-[11px] text-[#565E74]">{t(s.hintKey)}</span>
              </div>
            </div>
            <div className="text-end">
              <span className={`text-lg font-bold ${s.accent ? "text-[#004AC6]" : "text-[#0B1C30]"}`}>
                {s.value}
              </span>
              <span className="block text-[11px] text-[#565E74]">
                {pct(s.value, total).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled
        title={t("company.layout.soon")}
        className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#E5EEFF] py-2.5 text-sm font-bold text-[#2563EB] transition-all hover:bg-[#DCE9FF] disabled:opacity-70"
      >
        {t("company.fleet.manageFull")}
        <span aria-hidden="true">›</span>
      </button>
    </section>
  );
};

export default CompanyFleetStatus;