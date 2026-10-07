import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ChevronRight, Download, Plus, ShieldCheck } from "lucide-react";
import type { CompanyFleetData } from "../../types/companyFleet";

interface CompanyFleetHeaderProps {
  data: CompanyFleetData;
  loading: boolean;
  onExport: () => void;
}

/**
 * Breadcrumb + scoped-tenant strip and the "Fleet" hero row with the vehicle
 * count badge, a real CSV export of the visible page and the Add Vehicle
 * shortcut (kept behind "coming soon" — no create form exists for partners yet).
 */
export const CompanyFleetHeader: React.FC<CompanyFleetHeaderProps> = ({
  data,
  loading,
  onExport,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs font-semibold text-[#565E74]">
          <span>Portal</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t("company.bookingsPage.command")}</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-[#0B1C30]">{t("company.fleetPage.primary")}</span>
        </div>
        {data.company && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF4FF] px-3 py-1 text-[11px] font-semibold text-[#565E74]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden="true" />
            {t("company.fleetPage.scopedTenant", {
              company: data.company.name,
              code: data.company.code ?? "",
            })}
          </span>
        )}
      </div>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-[#0B1C30]">
              {t("company.fleetPage.title")}
            </h1>
            <span className="text-base font-semibold text-[#565E74]">
              / {t("company.fleetPage.titleAr")}
            </span>
            <span className="rounded-full bg-[#E5EEFF] px-2.5 py-0.5 text-[11px] font-bold text-[#2563EB]">
              {t("company.fleetPage.vehicleCount", {
                count: data.summary.total,
              })}
            </span>
          </div>
          <p className="text-sm text-[#565E74]">
            {t("company.fleetPage.subtitle")}{" "}
            <span className="font-medium text-[#434655]">
              {t("company.fleetPage.subtitleAr")}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onExport}
            disabled={loading || data.list.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-4 py-2.5 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-[18px] w-[18px] text-[#565E74]" aria-hidden="true" />
            {t("company.fleetPage.export")}
            <span className="text-xs font-normal text-[#9AA4B5]">
              ({t("company.fleetPage.exportAr")})
            </span>
          </button>
          <Link
            to="/company/fleet/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-all hover:bg-[#1D4ED8]"
          >
            <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
            {t("company.fleetPage.addVehicle")}
            <span className="text-xs font-normal text-white/80">
              ({t("company.fleetPage.addVehicleAr")})
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CompanyFleetHeader;