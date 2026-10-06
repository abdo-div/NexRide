import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, ClipboardPlus, RefreshCw, SearchCheck, Wrench } from "lucide-react";

interface CompanyMaintenanceHeaderProps {
  loading: boolean;
  totalRecords: number;
  onRefresh: () => void;
  onScheduleInspection: () => void;
  onAddRecord: () => void;
}

/**
 * "Maintenance & Inspection" hero row with the live chip, refresh and both
 * create actions (Schedule Inspection + Add Maintenance Record). Both open the
 * same real create form — the inspection/MoT concept itself is unmodelled.
 */
export const CompanyMaintenanceHeader: React.FC<CompanyMaintenanceHeaderProps> = ({
  loading,
  totalRecords,
  onRefresh,
  onScheduleInspection,
  onAddRecord,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs font-semibold text-[#565E74]">
          <span>Portal</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t("company.overview.command")}</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-[#0B1C30]">{t("company.maintenance.title")}</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF4FF] px-3 py-1 text-[11px] font-semibold text-[#565E74]">
          <SearchCheck className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden="true" />
          {t("company.maintenance.scopedTenant")}
        </span>
      </div>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-[#0B1C30]">
              {t("company.maintenance.title")}
            </h1>
            <span className="text-base font-semibold text-[#565E74]">
              / {t("company.maintenance.titleAr")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5EEFF] px-2.5 py-0.5 text-[11px] font-bold text-[#2563EB]">
              <Wrench className="h-3 w-3" aria-hidden="true" />
              {t("company.maintenance.recordCount", { count: totalRecords })}
            </span>
          </div>
          <p className="text-sm text-[#565E74]">
            {t("company.maintenance.subtitle")}{" "}
            <span className="font-medium text-[#434655]">
              {t("company.maintenance.subtitleAr")}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {t("company.maintenance.liveChip")}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-3.5 py-2 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw
              className={`h-4 w-4 text-[#2563EB] ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {t("company.maintenance.refresh")}
          </button>
          <button
            type="button"
            onClick={onScheduleInspection}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#F8FAFF] cursor-pointer"
          >
            <ClipboardPlus className="h-[18px] w-[18px] text-[#2563EB]" aria-hidden="true" />
            {t("company.maintenance.scheduleInspection")}
          </button>
          <button
            type="button"
            onClick={onAddRecord}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-all hover:bg-[#1D4ED8] cursor-pointer"
          >
            <Wrench className="h-[18px] w-[18px]" aria-hidden="true" />
            {t("company.maintenance.addRecord")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyMaintenanceHeader;