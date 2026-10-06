import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Activity, Download, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useCompanyDashboard } from "../../hooks/useCompanyDashboard";
import { formatLYD, saveBlobAsFile } from "../../lib/bookingView";
import { CompanyDashboardHeader } from "../../components/company/CompanyDashboardHeader";
import { CompanyKpiGrid } from "../../components/company/CompanyKpiGrid";
import { CompanyRevenueChart } from "../../components/company/CompanyRevenueChart";
import { CompanyFinancialBar } from "../../components/company/CompanyFinancialBar";
import { CompanyUpcomingBookings } from "../../components/company/CompanyUpcomingBookings";
import { CompanyFleetStatus } from "../../components/company/CompanyFleetStatus";
import { CompanyActivityFeed } from "../../components/company/CompanyActivityFeed";
import { CompanyPerformancePanel } from "../../components/company/CompanyPerformancePanel";
import type { CompanyDashboardData } from "../../types/companyDashboard";

const csv = (data: CompanyDashboardData): string => {
  const header = [
    "Reference",
    "Customer",
    "Vehicle",
    "Start Date",
    "End Date",
    "Total Amount (LYD)",
    "Company Share (LYD)",
    "Status",
  ];
  const rows = data.upcomingBookings.map((b) => [
    b.reference,
    b.customerName,
    `${[b.vehicleMake, b.vehicleModel].filter(Boolean).join(" ")} ${b.vehicleYear ?? ""}`.trim(),
    b.startDate,
    b.endDate,
    String(b.totalAmount),
    String(b.companyShare),
    b.bookingStatus,
  ]);
  return [header, ...rows].map((r) => r.join(",")).join("\n");
};

/** Fleet-operator operations dashboard (tenant-scoped). */
export const CompanyDashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { data, period, setPeriod, loading, error, reload } =
    useCompanyDashboard();

  const handleExport = useCallback(() => {
    if (data.upcomingBookings.length === 0) return;
    saveBlobAsFile(
      new Blob([csv(data)], { type: "text/csv;charset=utf-8" }),
      `nexride-dispatch-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }, [data]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      <div className="flex flex-col gap-6">
        {/* Page top bar */}
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-[#2563EB]">
                {t("company.overview.command")}
              </span>
              <span className="text-[#C3C6D7]">•</span>
              <span className="uppercase tracking-wider text-[#565E74]">
                {t("company.overview.grid")}
              </span>
            </div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-[#0B1C30]">
              {t("company.overview.title")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-3.5 py-2 text-sm font-semibold text-[#0B1C30] shadow-sm transition-all hover:bg-[#E5EEFF] disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 text-[#2563EB] ${loading ? "animate-spin" : ""}`} />
              {t("company.overview.refresh")}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading || data.upcomingBookings.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] transition-all hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              {t("company.overview.export")}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>
            <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          </div>
        ) : error ? (
          <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
            <Activity className="h-10 w-10 text-[#94A3B8]" />
            <p className="mt-4 max-w-md text-sm text-[#64748B]">
              {t("company.overview.loadError")}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
            >
              {t("company.overview.retry")}
            </button>
          </div>
        ) : (
          <>
            <CompanyDashboardHeader
              data={data}
              userName={user?.name}
              onExport={handleExport}
              exporting={loading}
            />

            <CompanyKpiGrid data={data} />

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
              {/* Main workflow column */}
              <div className="flex flex-col gap-6 xl:col-span-8">
                <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-[#0B1C30]">
                        {t("company.chart.title")}
                      </h2>
                      <span className="text-sm text-[#565E74]">
                        ({t("company.chart.titleAr")})
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-[#434655]">
                      {t("company.chart.subtitle")}
                    </p>
                  </div>

                  <CompanyRevenueChart
                    data={data}
                    period={period}
                    onPeriodChange={setPeriod}
                    lang={i18n.language}
                  />

                  <CompanyFinancialBar data={data} />
                </section>

                <CompanyUpcomingBookings data={data} lang={i18n.language} />
              </div>

              {/* Sidebar metrics column */}
              <div className="flex flex-col gap-6 xl:col-span-4">
                <CompanyFleetStatus data={data} />
                <CompanyActivityFeed data={data} lang={i18n.language} />
                <CompanyPerformancePanel data={data} />
              </div>
            </div>

            {/* Compliance / support helper strip */}
            <footer className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-[#434655] shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] md:flex-row">
              <div className="flex items-center gap-3 text-center md:text-start">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E5EEFF] text-[#2563EB]"
                  aria-hidden="true"
                >
                  ·
                </span>
                <span className="text-sm">
                  {t("company.overview.operationsLine")}
                </span>
              </div>
              <span className="max-w-xs text-end text-[11px] text-[#565E74]">
                {t("company.overview.compliance", {
                  value: formatLYD(data.kpis.pendingPayout),
                })}
              </span>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default CompanyDashboardPage;