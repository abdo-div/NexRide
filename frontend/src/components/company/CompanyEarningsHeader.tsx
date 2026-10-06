import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  ShieldCheck,
  Table2,
  Wallet,
} from "lucide-react";
import type {
  CompanyEarningsCompany,
  EarningsRangeFilter,
} from "../../types/companyEarnings";

const RANGE_OPTIONS: EarningsRangeFilter[] = [
  "all",
  "today",
  "7d",
  "30d",
  "thisMonth",
  "lastMonth",
  "3m",
  "year",
];

const rangeLabelKey = (range: EarningsRangeFilter): string =>
  `company.payoutsPage.range.${range}`;

interface CompanyEarningsHeaderProps {
  company: CompanyEarningsCompany | null;
  range: EarningsRangeFilter;
  onRangeChange: (range: EarningsRangeFilter) => void;
  loading: boolean;
  canExport: boolean;
  onExport: () => void;
  onViewPayouts: () => void;
}

/**
 * Breadcrumb + hero card for the Earnings & Transactions workspace: the scoped
 * tenant chip, a real date-range selector that re-drives the whole deck, an
 * export menu (CSV of the current register page is real; the PDF audit dossier
 * is parked as coming soon), and a shortcut that scrolls to the settlement
 * liquidity split below.
 */
export const CompanyEarningsHeader: React.FC<CompanyEarningsHeaderProps> = ({
  company,
  range,
  onRangeChange,
  loading,
  canExport,
  onExport,
  onViewPayouts,
}) => {
  const { t } = useTranslation();
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb & scope notification */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs font-semibold text-[#565E74]">
          <span>{t("company.payoutsPage.breadcrumb")}</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-[#0B1C30]">{t("company.payoutsPage.primary")}</span>
        </div>
        {company && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF4FF] px-3 py-1 text-[11px] font-semibold text-[#565E74]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden="true" />
            {t("company.payoutsPage.scopedTenant", { code: company.slug })}
          </span>
        )}
      </div>

      {/* Hero card */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] xl:flex-row xl:items-center">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-[#0B1C30]">
              {t("company.payoutsPage.title")}
            </h1>
            <span className="text-base font-semibold text-[#565E74]">
              {t("company.payoutsPage.titleAr")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <ArrowUp className="h-3 w-3" aria-hidden="true" />
              {t("company.payoutsPage.verifiedBadge")}
            </span>
          </div>
          <p className="text-sm text-[#565E74]">
            {t("company.payoutsPage.subtitle", { name: company?.name ?? t("company.payoutsPage.primary") })}{" "}
            <span className="font-medium text-[#434655]">
              {t("company.payoutsPage.subtitleAr", { name: company?.name ?? t("company.payoutsPage.primary") })}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {/* Date range selector */}
          <div className="relative flex items-center rounded-xl bg-[#EFF4FF] px-3 py-2">
            <CalendarRange className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
            <label className="relative">
              <span className="sr-only">{t("company.payoutsPage.range.label")}</span>
              <select
                value={range}
                disabled={loading}
                onChange={(event) =>
                  onRangeChange(event.target.value as EarningsRangeFilter)
                }
                className="cursor-pointer appearance-none rounded-xl bg-transparent py-1 ps-3 pe-7 text-sm font-bold text-[#0B1C30] outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(rangeLabelKey(option))}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute end-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#565E74]"
                aria-hidden="true"
              />
            </label>
          </div>

          {/* Export dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((open) => !open)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-4 py-2.5 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-[18px] w-[18px] text-[#565E74]" aria-hidden="true" />
              {t("company.payoutsPage.exportTitle")}
            </button>
            {exportOpen && (
              <div className="absolute end-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-2xl">
                <button
                  type="button"
                  disabled={!canExport}
                  onClick={() => {
                    setExportOpen(false);
                    onExport();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold text-[#0B1C30] transition-colors hover:bg-[#F8FAFF] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Table2 className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                  {t("company.payoutsPage.exportCsv")}
                </button>
                <button
                  type="button"
                  disabled
                  title={t("company.payoutsPage.exportSoon")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold text-[#9AA4B5]"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {t("company.payoutsPage.exportPdf")}
                </button>
              </div>
            )}
          </div>

          {/* Jump to settlements */}
          <button
            type="button"
            onClick={onViewPayouts}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B1C30] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1A2F43] cursor-pointer"
          >
            <Wallet className="h-[18px] w-[18px]" aria-hidden="true" />
            {t("company.payoutsPage.viewPayouts")}
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyEarningsHeader;