import React from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronRight, Download, ShieldCheck } from "lucide-react";
import type { CompanyBookingsData } from "../../types/companyBookings";

interface CompanyBookingsHeaderProps {
  data: CompanyBookingsData;
  loading: boolean;
  onExport: () => void;
}

/**
 * Breadcrumb + scoped-tenant strip and the "Bookings" hero card with the
 * all-time counter, Export (CSV of the current page) and the calendar shortcut.
 * Everything shown is answered by the tenant-scoped register.
 */
export const CompanyBookingsHeader: React.FC<CompanyBookingsHeaderProps> = ({
  data,
  loading,
  onExport,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb & scope notification */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs font-semibold text-[#565E74]">
          <span className="transition-colors">Portal</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="transition-colors">
            {t("company.bookingsPage.command")}
          </span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-[#0B1C30]">{t("company.bookingsPage.primary")}</span>
        </div>
        {data.company && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF4FF] px-3 py-1 text-[11px] font-semibold text-[#565E74]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden="true" />
            {t("company.bookingsPage.scopedTenant", {
              company: data.company.name,
              code: data.company.code,
            })}
          </span>
        )}
      </div>

      {/* Hero card */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] md:flex-row md:items-center">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-[#0B1C30]">
              {t("company.bookingsPage.title")}
            </h1>
            <span className="text-base font-semibold text-[#565E74]">
              {t("company.bookingsPage.titleAr")}
            </span>
            <span className="rounded-full bg-[#E5EEFF] px-2.5 py-0.5 text-[11px] font-bold text-[#2563EB]">
              {t("company.bookingsPage.totalBadge", {
                count: data.summary.total,
              })}
            </span>
          </div>
          <p className="text-sm text-[#565E74]">
            {t("company.bookingsPage.subtitle")}{" "}
            <span className="font-medium text-[#434655]">
              {t("company.bookingsPage.subtitleAr")}
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
            {t("company.bookingsPage.export")}
          </button>
          <button
            type="button"
            disabled
            title={t("company.bookingsPage.soon")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)] transition-all hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CalendarDays className="h-[18px] w-[18px]" aria-hidden="true" />
            {t("company.bookingsPage.viewCalendar")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyBookingsHeader;