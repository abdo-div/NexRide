import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Activity } from "lucide-react";
import { useCompanyEarnings } from "../../hooks/useCompanyEarnings";
import { companyEarningsApi } from "../../lib/companyEarningsApi";
import { saveBlobAsFile } from "../../lib/bookingView";
import { vehicleLineOf } from "../../lib/companyEarningsView";
import type { CompanyEarningsData, CompanyEarningsRow } from "../../types/companyEarnings";
import { CompanyEarningsHeader } from "../../components/company/CompanyEarningsHeader";
import { CompanyEarningsKpiCards } from "../../components/company/CompanyEarningsKpiCards";
import { CompanyEarningsWaterfall } from "../../components/company/CompanyEarningsWaterfall";
import { CompanyEarningsChart } from "../../components/company/CompanyEarningsChart";
import { CompanyPayoutSettlements } from "../../components/company/CompanyPayoutSettlements";
import { CompanyTopVehicles } from "../../components/company/CompanyTopVehicles";
import { CompanyEarningsToolbar } from "../../components/company/CompanyEarningsToolbar";
import { CompanyEarningsTable } from "../../components/company/CompanyEarningsTable";
import { CompanyTransactionDrawer } from "../../components/company/CompanyTransactionDrawer";

const csv = (data: CompanyEarningsData): string => {
  const header = [
    "Txn Ref",
    "Booking",
    "Vehicle",
    "Depot",
    "Date & Time",
    "Gross (LYD)",
    "Fee (LYD)",
    "Fee Rate (%)",
    "Net (LYD)",
    "Payment Method",
    "Status",
    "Payout",
  ];
  const rows = data.list.map((row) => [
    row.trxRef,
    row.booking?.reference ?? "",
    row.vehicle ? vehicleLineOf(row.vehicle) : "",
    row.booking?.pickupLocation ?? "",
    row.createdAt ?? "",
    String(row.amount),
    String(row.commissionAmount),
    String(row.commissionRate),
    String(row.companyShare),
    row.paymentMethod,
    row.status,
    row.payoutStatus,
  ]);
  return [header, ...rows].join("\n");
};

/**
 * Company Earnings & Transactions — the partner money workspace at
 * /company/payouts: a date-ranged analytical deck (KPIs, settlement-flow
 * waterfall, revenue chart, liquidity split, top vehicles) rebuilt from the
 * tenant's own Payment ledger, above a searchable, filterable register with a
 * per-transaction audit drawer and real PDF invoice download. Numbers are never
 * mocked: where a workspace has no model yet (the Payouts & Transfers ledger),
 * it surfaces as coming soon instead of inventing data.
 */
export const CompanyEarningsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const {
    data,
    loading,
    error,
    reload,
    range,
    setRange,
    chartRange,
    setChartRange,
    searchDraft,
    setSearch,
    status,
    setStatus,
    vehicleId,
    setVehicleId,
    method,
    setMethod,
    setPage,
    setLimit,
    resetFilters,
  } = useCompanyEarnings();

  const [activeRow, setActiveRow] = useState<CompanyEarningsRow | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const settlementsRef = useRef<HTMLDivElement | null>(null);
  const registerRef = useRef<HTMLDivElement | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  };

  const lang = i18n.language;
  const { settings, summary, chart, topVehicles, mix, vehicles, list, pagination } = data;

  const hasActiveFilters =
    searchDraft.trim().length > 0 || status !== "all" || vehicleId !== "" || method !== "all";

  const handleExport = useCallback(() => {
    if (data.list.length === 0) return;
    saveBlobAsFile(
      new Blob([csv(data)], { type: "text/csv;charset=utf-8" }),
      `nexride-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }, [data]);

  const handleDownloadPdf = useCallback(
    async (row: CompanyEarningsRow) => {
      setPdfBusy(true);
      try {
        const blob = await companyEarningsApi.downloadInvoice(row.id);
        saveBlobAsFile(blob, `invoice-${row.id}.pdf`);
        showToast(t("company.payoutsPage.toasts.pdfSuccess"));
      } catch {
        showToast(t("company.payoutsPage.toasts.pdfError"));
      } finally {
        setPdfBusy(false);
      }
    },
    [t],
  );

  const scrollToSettlements = useCallback(() => {
    settlementsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToRegister = useCallback(() => {
    registerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      <div className="flex flex-col gap-6">
        <CompanyEarningsHeader
          company={data.company ?? null}
          range={range}
          onRangeChange={setRange}
          loading={loading}
          canExport={list.length > 0}
          onExport={handleExport}
          onViewPayouts={scrollToSettlements}
        />

        <CompanyEarningsKpiCards summary={summary} lang={lang} />

        {error ? (
          <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
            <Activity className="h-10 w-10 text-[#94A3B8]" />
            <p className="mt-4 max-w-md text-sm text-[#64748B]">
              {t("company.payoutsPage.states.loadError")}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
            >
              {t("company.payoutsPage.states.retry")}
            </button>
          </div>
        ) : (
          <>
            {loading && summary.gross === 0 ? (
              <div className="space-y-3">
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#E5EEFF]" />
                <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />
              </div>
            ) : (
              <CompanyEarningsWaterfall
                summary={summary}
                settings={settings}
                onPolicy={() => showToast(t("company.payoutsPage.toasts.policySoon"))}
              />
            )}

            <div
              ref={settlementsRef}
              className="grid scroll-mt-24 grid-cols-1 items-start gap-6 lg:grid-cols-3"
            >
              <div className="lg:col-span-2">
                <CompanyEarningsChart
                  chart={chart}
                  chartRange={chartRange}
                  onChartRangeChange={setChartRange}
                  loading={loading}
                />
              </div>
              <div className="lg:col-span-1">
                <CompanyPayoutSettlements
                  summary={summary}
                  settings={settings}
                  onViewPayouts={scrollToRegister}
                  onOpenSettings={() => navigate("/company/settings")}
                />
              </div>
            </div>

            <CompanyTopVehicles
              topVehicles={topVehicles}
              mix={mix}
              selectedVehicleId={vehicleId}
              onSelectVehicle={setVehicleId}
              loading={loading}
            />

            {/* Recent Transactions register */}
            <section ref={registerRef} className="flex scroll-mt-24 flex-col gap-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[20px] font-bold text-[#0B1C30]">
                      {t("company.payoutsPage.register.title")}
                    </h2>
                    <span className="text-base font-semibold text-[#565E74]">
                      {t("company.payoutsPage.register.titleAr")}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#565E74]">
                    {t("company.payoutsPage.register.subtitle")}
                  </p>
                </div>
              </div>

              <CompanyEarningsToolbar
                search={searchDraft}
                onSearchChange={setSearch}
                status={status}
                onStatusChange={setStatus}
                vehicleId={vehicleId}
                onVehicleIdChange={setVehicleId}
                vehicles={vehicles}
                method={method}
                onMethodChange={setMethod}
                count={pagination.total}
                loading={loading}
                hasActiveFilters={hasActiveFilters}
                onClear={resetFilters}
              />

              {loading && list.length === 0 ? (
                <div className="space-y-3">
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#E5EEFF]" />
                  <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                </div>
              ) : error ? (
                <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
                  <Activity className="h-10 w-10 text-[#94A3B8]" />
                  <p className="mt-4 max-w-md text-sm text-[#64748B]">
                    {t("company.payoutsPage.states.loadError")}
                  </p>
                  <button
                    type="button"
                    onClick={reload}
                    className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
                  >
                    {t("company.payoutsPage.states.retry")}
                  </button>
                </div>
              ) : (
                <CompanyEarningsTable
                  rows={list}
                  lang={lang}
                  loading={loading}
                  hasActiveFilters={hasActiveFilters}
                  pagination={pagination}
                  onPageChange={setPage}
                  onLimitChange={setLimit}
                  onOpenRow={setActiveRow}
                />
              )}
            </section>
          </>
        )}
      </div>

      {/* Transaction audit drawer */}
      {activeRow && (
        <CompanyTransactionDrawer
          row={activeRow}
          settings={settings}
          lang={lang}
          busy={pdfBusy}
          onClose={() => setActiveRow(null)}
          onDownloadPdf={(row) => void handleDownloadPdf(row)}
        />
      )}

      {/* Local toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#0B1C30] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(8,19,31,0.35)]">
          {toast}
        </div>
      )}
    </div>
  );
};

export default CompanyEarningsPage;