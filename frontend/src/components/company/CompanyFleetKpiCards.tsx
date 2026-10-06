import React from "react";
import { useTranslation } from "react-i18next";
import { Car, CheckCircle2, KeyRound, Wrench, ClipboardPenLine } from "lucide-react";
import type { CompanyFleetSummary } from "../../types/companyFleet";

interface CompanyFleetKpiCardsProps {
  summary: CompanyFleetSummary;
}

/** Fleet-posture deck: 5 KPI cards, each with a progress bar as % of the total fleet. */
export const CompanyFleetKpiCards: React.FC<CompanyFleetKpiCardsProps> = ({
  summary,
}) => {
  const { t } = useTranslation();
  const total = Math.max(summary.total, 1);

  const pct = (value: number) => Math.min(100, Math.round((value / total) * 100));

  const cards = [
    {
      key: "total",
      label: t("company.fleetPage.kpi.total"),
      labelAr: t("company.fleetPage.kpi.totalAr"),
      value: summary.total,
      pct: 100,
      icon: Car,
      iconStyle: "bg-[#EFF4FF] text-[#2563EB]",
      barStyle: "bg-[#2563EB]",
    },
    {
      key: "available",
      label: t("company.fleetPage.kpi.available"),
      labelAr: t("company.fleetPage.kpi.availableAr"),
      value: summary.available,
      pct: pct(summary.available),
      icon: CheckCircle2,
      iconStyle: "bg-[#ECFDF5] text-[#059669]",
      barStyle: "bg-[#0BA05F]",
      pulse: true,
    },
    {
      key: "rented",
      label: t("company.fleetPage.kpi.rented"),
      labelAr: t("company.fleetPage.kpi.rentedAr"),
      value: summary.rented,
      pct: pct(summary.rented),
      icon: KeyRound,
      iconStyle: "bg-[#EFF4FF] text-[#2563EB]",
      barStyle: "bg-[#2563EB]",
      pulse: true,
    },
    {
      key: "maintenance",
      label: t("company.fleetPage.kpi.maintenance"),
      labelAr: t("company.fleetPage.kpi.maintenanceAr"),
      value: summary.maintenance,
      pct: pct(summary.maintenance),
      icon: Wrench,
      iconStyle: "bg-[#FFF7ED] text-[#B54E00]",
      barStyle: "bg-[#EA8A00]",
    },
    {
      key: "draft",
      label: t("company.fleetPage.kpi.draft"),
      labelAr: t("company.fleetPage.kpi.draftAr"),
      value: summary.draft,
      pct: pct(summary.draft),
      icon: ClipboardPenLine,
      iconStyle: "bg-[#F1F5F9] text-[#64748B]",
      barStyle: "bg-[#64748B]",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconStyle}`}
            >
              <card.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#9AA4B5]">
              {card.pulse && (
                <span className="relative flex h-2 w-2">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${card.barStyle}`}
                  />
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${card.barStyle}`}
                  />
                </span>
              )}
              {card.pct}%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-extrabold tracking-tight text-[#0B1C30]">
              {card.value}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[#0B1C30]">{card.label}</p>
          <p className="text-xs text-[#565E74]">{card.labelAr}</p>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${card.barStyle}`}
              style={{ width: `${card.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default CompanyFleetKpiCards;