import React from "react";
import { Link } from "react-router";
import { Printer, Download } from "lucide-react";
import { ConfirmationIcon } from "./ConfirmationIcon";
import type { ConfirmationMeta } from "../../types/bookingConfirmation";

interface Props {
  vehicleTitle: string;
  vehicleId: string;
  meta: ConfirmationMeta;
  onPrint: () => void;
  onDownload: () => void;
}

export const ConfirmationHeader: React.FC<Props> = ({
  vehicleTitle,
  vehicleId,
  meta,
  onPrint,
  onDownload,
}) => {
  const { crumbs, stepBadge, success } = meta;
  const vehicleCrumbIndex = 2;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-[13px] text-[#64748B]">
          {crumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-[#CBD5E1]">/</span>}
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-[#2563EB] transition-colors">
                  {crumb.label}
                </Link>
              ) : i === vehicleCrumbIndex ? (
                <Link
                  to={`/cars/${vehicleId}`}
                  className="hover:text-[#2563EB] transition-colors truncate max-w-[200px]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className={i === crumbs.length - 1 ? "text-[#0F172A] font-bold" : ""}>
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
        <div className="inline-flex items-center gap-2 bg-white shadow-sm px-3.5 py-1.5 rounded-full self-start sm:self-auto">
          <ConfirmationIcon name="verified" className="w-[16px] h-[16px] text-[#2563EB]" />
          <span className="text-[11px] uppercase tracking-wider text-[#0F172A] font-bold">
            {stepBadge.caption}
          </span>
          <span className="text-[11px] text-[#2563EB] font-bold">{stepBadge.value}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-10 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#DBE1FF]/40 rounded-full blur-3xl pointer-events-none" />
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#F8FAFC] flex items-center justify-center shrink-0 shadow-inner">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-md">
            <ConfirmationIcon name="done" className="w-[26px] h-[26px] sm:w-[30px] sm:h-[30px]" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 z-10 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#DBE1FF] text-[#003EA8] text-[11px] font-bold uppercase tracking-wider">
              {success.badge}
            </span>
            <span className="text-[#CBD5E1]">•</span>
            <span className="text-[11px] text-[#64748B]">{success.validation}</span>
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-bold text-[#0F172A] tracking-tight">
            {success.title}
          </h1>
          <p className="text-[14px] text-[#64748B] leading-relaxed">
            {success.desc(vehicleTitle)}
          </p>
        </div>
        <div className="md:ml-auto shrink-0 flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto z-10">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] text-[12px] font-semibold transition-all shadow-sm"
          >
            <Printer className="w-[18px] h-[18px]" />
            {success.printLabel}
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] text-[12px] font-semibold transition-all shadow-sm"
          >
            <Download className="w-[18px] h-[18px]" />
            {success.downloadLabel}
          </button>
        </div>
      </div>
    </>
  );
};