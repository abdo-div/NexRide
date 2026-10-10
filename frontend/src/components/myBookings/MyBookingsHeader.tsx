import React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Download, Plus } from "lucide-react";

interface MyBookingsHeaderProps {
  onExport: () => void;
  exportBusy: boolean;
}

export const MyBookingsHeader: React.FC<MyBookingsHeaderProps> = ({
  onExport,
  exportBusy,
}) => {
  const { t, i18n } = useTranslation();
  const Chevron = i18n.dir() === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <section className="flex flex-col gap-3">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
        <Link to="/" className="hover:text-blue-600 transition-colors">
          {t("myBookings.breadcrumbHome")}
        </Link>
        <Chevron className="w-4 h-4 text-slate-400" />
        <span className="text-slate-900 font-semibold">
          {t("nav.myBookings")}
        </span>
      </nav>

      {/* Title header bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[26px] lg:text-[28px] font-extrabold tracking-tight text-[#0F172A]">
              {t("myBookings.title")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#DCE9FF] text-[#004AC6] text-[11px] font-bold uppercase tracking-wider">
              {t("myBookings.vipBadge")}
            </span>
          </div>
          <p className="text-[14px] text-[#64748B] max-w-2xl leading-relaxed">
            {t("myBookings.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onExport}
            disabled={exportBusy}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#2563EB]" />
            <span>{exportBusy ? t("myBookings.exportBusy") : t("myBookings.export")}</span>
          </button>
          <Link
            to="/FleetPage"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-sm font-bold shadow-[0_4px_12px_rgba(37,99,235,0.25)] transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t("myBookings.newBooking")}</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MyBookingsHeader;