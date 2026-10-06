import React from "react";
import { useTranslation } from "react-i18next";
import { Download, Landmark, Plus, ShieldCheck, Wallet } from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import type { CompanyDashboardData } from "../../types/companyDashboard";

interface CompanyDashboardHeaderProps {
  data: CompanyDashboardData;
  userName?: string;
  onExport: () => void;
  exporting: boolean;
}

/**
 * Welcome header for the operator workspace: partner greeting + certification
 * badge, quick actions and the live settlement-clearance strip. The numbers in
 * the strip come straight from the tenant aggregation (never hard-coded).
 */
export const CompanyDashboardHeader: React.FC<CompanyDashboardHeaderProps> = ({
  data,
  userName,
  onExport,
  exporting,
}) => {
  const { t } = useTranslation();
  const company = data.company;

  return (
    <header className="flex flex-col gap-5">
      {/* Top meta & title bar */}
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1C30] md:text-[28px]">
              {t("company.header.welcome", { name: userName ?? "Partner" })}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCE9FF] px-3 py-1 text-sm font-semibold text-[#2563EB] shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              {t("company.header.certifiedBadge", {
                city: company?.city ?? t("company.header.yourHub"),
              })}
            </span>
          </div>
          <p className="mt-0.5 max-w-3xl text-sm text-[#434655]">
            {t("company.header.subtitle", {
              company: company?.name ?? t("company.header.yourCompany"),
            })}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-60 cursor-pointer"
          >
            <Download className="h-5 w-5 text-[#565E74]" />
            {t("company.header.exportFleet")}
          </button>
          <button
            type="button"
            disabled
            title={t("company.layout.soon")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#DCE9FF] px-4 py-2.5 text-sm font-semibold text-[#2563EB] shadow-sm transition-all hover:bg-[#D3E4FE] cursor-not-allowed"
          >
            <Landmark className="h-5 w-5" />
            {t("company.header.requestClearance")}
          </button>
          <button
            type="button"
            disabled
            title={t("company.layout.soon")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(37,99,235,0.28)] transition-all hover:opacity-95 cursor-not-allowed"
          >
            <Plus className="h-5 w-5" />
            {t("company.header.addVehicle")}
          </button>
        </div>
      </div>

      {/* Live settlement alert banner */}
      <div className="flex w-full flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5EEFF] text-[#2563EB]">
            <Wallet className="h-[22px] w-[22px]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-semibold text-[#0B1C30]">
                {t("company.header.clearingTitle")}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#0053DB]" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#565E74]">
                {t("company.header.cycleLabel", {
                  cycle: data.period.label.toUpperCase(),
                })}
              </span>
            </div>
            <span className="text-sm text-[#434655]">
              {t("company.header.estimatedDisbursal", {
                amount: formatLYD(data.kpis.pendingPayout),
              })}
              {" • "}
              <strong className="font-semibold text-[#0B1C30]">
                {t("company.header.awaiting", {
                  count: data.kpis.pendingPayoutCount,
                })}
              </strong>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF4FF] px-3 py-1 text-sm font-semibold text-[#2563EB]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#2563EB]" />
            {t("company.header.rtgsActive")}
          </span>
          <button
            type="button"
            disabled
            title={t("company.layout.soon")}
            className="inline-flex items-center gap-0.5 rounded-full bg-[#EFF4FF] px-3 py-1 text-sm font-semibold text-[#2563EB] transition-colors hover:bg-[#DCE9FF] cursor-not-allowed"
          >
            {t("company.header.auditTrail")}
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default CompanyDashboardHeader;