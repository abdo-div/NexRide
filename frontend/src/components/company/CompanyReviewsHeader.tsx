import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  ChevronRight,
  Download,
  FileText,
  List,
  ShieldCheck,
  Table2,
} from "lucide-react";
import type { CompanyReviewsCompany } from "../../types/companyReviews";

export type CompanyReviewView = "detailed" | "compact";

interface CompanyReviewsHeaderProps {
  company: CompanyReviewsCompany | null;
  loading: boolean;
  canExport: boolean;
  onExport: () => void;
  view: CompanyReviewView;
  onViewChange: (view: CompanyReviewView) => void;
}

/**
 * Breadcrumb + hero card for the Reviews & Ratings workspace: the scoped
 * tenant chip, the verified-reviews badge, an export menu (CSV of the current
 * page is real; the PDF executive summary is parked as coming soon) and the
 * Detailed/Compact view switcher from the design mock.
 */
export const CompanyReviewsHeader: React.FC<CompanyReviewsHeaderProps> = ({
  company,
  loading,
  canExport,
  onExport,
  view,
  onViewChange,
}) => {
  const { t } = useTranslation();
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb & scope notification */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs font-semibold text-[#565E74]">
          <span>{t("company.reviewsPage.breadcrumb")}</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-[#0B1C30]">{t("company.reviewsPage.primary")}</span>
        </div>
        {company && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF4FF] px-3 py-1 text-[11px] font-semibold text-[#565E74]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden="true" />
            {t("company.reviewsPage.scopedTenant", { code: company.slug })}
          </span>
        )}
      </div>

      {/* Hero card */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] md:flex-row md:items-center">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-[#0B1C30]">
              {t("company.reviewsPage.title")}
            </h1>
            <span className="text-base font-semibold text-[#565E74]">
              {t("company.reviewsPage.titleAr")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <BadgeCheck className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" />
              {t("company.reviewsPage.verifiedBadge")}
            </span>
          </div>
          <p className="text-sm text-[#565E74]">
            {t("company.reviewsPage.subtitle")}{" "}
            <span className="font-medium text-[#434655]">
              {t("company.reviewsPage.subtitleAr")}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {/* Export dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((open) => !open)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-4 py-2.5 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-[18px] w-[18px] text-[#565E74]" aria-hidden="true" />
              {t("company.reviewsPage.exportTitle")}
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-2xl">
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
                  {t("company.reviewsPage.exportCsv")}
                </button>
                <button
                  type="button"
                  disabled
                  title={t("company.reviewsPage.exportSoon")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold text-[#9AA4B5]"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {t("company.reviewsPage.exportPdf")}
                </button>
              </div>
            )}
          </div>

          {/* Detailed / Compact view switcher */}
          <div className="flex items-center bg-[#F1F5F9] p-1 rounded-xl shadow-inner">
            <button
              type="button"
              onClick={() => onViewChange("detailed")}
              aria-label={t("company.reviewsPage.viewDetailed")}
              title={t("company.reviewsPage.viewDetailed")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors cursor-pointer ${
                view === "detailed"
                  ? "bg-white text-[#2563EB] shadow-sm"
                  : "text-[#565E74] hover:text-[#0B1C30]"
              }`}
            >
              <List className="h-4 w-4" aria-hidden="true" />
              {t("company.reviewsPage.viewDetailed")}
            </button>
            <button
              type="button"
              onClick={() => onViewChange("compact")}
              aria-label={t("company.reviewsPage.viewCompact")}
              title={t("company.reviewsPage.viewCompact")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors cursor-pointer ${
                view === "compact"
                  ? "bg-white text-[#2563EB] shadow-sm"
                  : "text-[#565E74] hover:text-[#0B1C30]"
              }`}
            >
              <Table2 className="h-4 w-4" aria-hidden="true" />
              {t("company.reviewsPage.viewCompact")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyReviewsHeader;