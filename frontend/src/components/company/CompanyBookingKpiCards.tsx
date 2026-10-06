import React from "react";
import { useTranslation } from "react-i18next";
import { ClipboardCheck, ReceiptText } from "lucide-react";
import type { CompanyBookingsSummary } from "../../types/companyBookings";

interface CompanyBookingKpiCardsProps {
  summary: CompanyBookingsSummary;
}

/**
 * The compact 5-card bento deck from the design: all-time bookings split into
 * the four live states. Every counter is the tenant's OWN ledger total — the
 * same group the toolbar dropdowns are built from, so the page never invents a
 * number the table cannot reproduce.
 */
export const CompanyBookingKpiCards: React.FC<CompanyBookingKpiCardsProps> = ({
  summary,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {/* 1. Total Bookings */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
            {t("company.bookingsPage.kpis.total")}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#565E74]">
            <ReceiptText className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-extrabold tracking-tight text-[#0B1C30]">
              {summary.total}
            </span>
            <span className="text-[11px] font-semibold text-[#565E74]">
              {t("company.bookingsPage.kpis.totalAr")}
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] text-[#565E74]">
            {t("company.bookingsPage.kpis.totalHint")}
          </p>
        </div>
      </div>

      {/* 2. Pending */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
            {t("company.bookingsPage.kpis.pending")}
          </span>
          <span className="rounded-full bg-[#FFE1CE] px-2 py-0.5 text-[11px] font-bold text-[#8E3C00]">
            {t("company.bookingsPage.kpis.pendingNew", {
              count: summary.pending,
            })}
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-extrabold tracking-tight text-[#B54E00]">
              {summary.pending}
            </span>
            <span className="text-[11px] font-semibold text-[#565E74]">
              {t("company.bookingsPage.kpis.pendingAr")}
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] text-[#565E74]">
            {t("company.bookingsPage.kpis.pendingHint")}
          </p>
        </div>
      </div>

      {/* 3. Confirmed */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
            {t("company.bookingsPage.kpis.confirmed")}
          </span>
          <span className="rounded-full bg-[#DAE2FD] px-2 py-0.5 text-[11px] font-bold text-[#004AC6]">
            {t("company.bookingsPage.kpis.confirmedTag")}
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-extrabold tracking-tight text-[#004AC6]">
              {summary.confirmed}
            </span>
            <span className="text-[11px] font-semibold text-[#565E74]">
              {t("company.bookingsPage.kpis.confirmedAr")}
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] text-[#565E74]">
            {t("company.bookingsPage.kpis.confirmedHint")}
          </p>
        </div>
      </div>

      {/* 4. Active */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
            {t("company.bookingsPage.kpis.active")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[11px] font-bold text-[#0B1C30]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2563EB]" />
            {t("company.bookingsPage.kpis.activeTag")}
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-extrabold tracking-tight text-[#0B1C30]">
              {summary.active}
            </span>
            <span className="text-[11px] font-semibold text-[#565E74]">
              {t("company.bookingsPage.kpis.activeAr")}
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] text-[#565E74]">
            {t("company.bookingsPage.kpis.activeHint")}
          </p>
        </div>
      </div>

      {/* 5. Completed */}
      <div className="col-span-2 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
            {t("company.bookingsPage.kpis.completed")}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#565E74]">
            <ClipboardCheck className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-extrabold tracking-tight text-[#0B1C30]">
              {summary.completed}
            </span>
            <span className="text-[11px] font-semibold text-[#565E74]">
              {t("company.bookingsPage.kpis.completedAr")}
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] text-[#565E74]">
            {t("company.bookingsPage.kpis.completedHint")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompanyBookingKpiCards;