import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, Inbox } from "lucide-react";
import { useCompanyBookings } from "../../hooks/useCompanyBookings";
import { saveBlobAsFile } from "../../lib/bookingView";
import { CompanyBookingsHeader } from "../../components/company/CompanyBookingsHeader";
import { CompanyBookingKpiCards } from "../../components/company/CompanyBookingKpiCards";
import { CompanyBookingsToolbar } from "../../components/company/CompanyBookingsToolbar";
import { CompanyBookingsTable } from "../../components/company/CompanyBookingsTable";
import { CompanyBookingInspectDrawer } from "../../components/company/CompanyBookingInspectDrawer";
import { CompanyBookingsEmptyState } from "../../components/company/CompanyBookingsEmptyState";
import type {
  CompanyBookingRow,
  CompanyBookingsData,
} from "../../types/companyBookings";

const csv = (data: CompanyBookingsData): string => {
  const header = [
    "Reference",
    "Channel",
    "Customer",
    "Phone",
    "Vehicle",
    "Start Date",
    "End Date",
    "Days",
    "Total Amount (LYD)",
    "Company Share (LYD)",
    "Payment",
    "Status",
  ];
  const rows = data.list.map((row) => [
    row.reference,
    row.channel,
    row.customer.name,
    row.customer.phone ?? "",
    `${[row.vehicle.make, row.vehicle.model].filter(Boolean).join(" ")} ${row.vehicle.year ?? ""}`.trim(),
    row.startDate,
    row.endDate,
    String(row.days),
    String(row.totalAmount),
    String(row.companyShare),
    row.payment,
    row.bookingStatus,
  ]);
  return [header, ...rows].join("\n");
};

/** Bookings & Dispatches register — the tenant's full operations ledger. */
export const CompanyBookingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    data,
    loading,
    error,
    reload,
    view,
    setView,
    search,
    setSearch,
    status,
    setStatus,
    payment,
    setPayment,
    vehicleId,
    setVehicleId,
    fromDate,
    setFromDate,
    setPage,
    setLimit,
    resetFilters,
  } = useCompanyBookings();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => data.list.find((row) => row.id === selectedId) ?? data.list[0] ?? null,
    [data.list, selectedId],
  );

  const handleSelect = useCallback((row: CompanyBookingRow) => {
    setSelectedId(row.id);
  }, []);

  const vehicles = useMemo(
    () =>
      data.vehicles.map((vehicle) => ({
        id: vehicle.id,
        label: `${[vehicle.make, vehicle.model].filter(Boolean).join(" ")}${
          vehicle.year ? ` (${vehicle.year})` : ""
        }`,
      })),
    [data.vehicles],
  );

  const handleExport = useCallback(() => {
    if (data.list.length === 0) return;
    saveBlobAsFile(
      new Blob([csv(data)], { type: "text/csv;charset=utf-8" }),
      `nexride-bookings-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }, [data]);

  const lang = i18n.language;
  const { summary, list, pagination } = data;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      <div className="flex flex-col gap-6">
        <CompanyBookingsHeader
          data={data}
          loading={loading}
          onExport={handleExport}
        />

        <CompanyBookingKpiCards summary={summary} />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Main register column */}
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-8">
            <CompanyBookingsToolbar
              view={view}
              onViewChange={setView}
              tabCounts={{
                all: summary.total,
                upcoming: summary.upcoming,
                handover: summary.handover,
              }}
              search={search}
              onSearchChange={setSearch}
              status={status}
              onStatusChange={setStatus}
              payment={payment}
              onPaymentChange={setPayment}
              vehicles={vehicles}
              vehicleId={vehicleId}
              onVehicleChange={setVehicleId}
              fromDate={fromDate}
              onFromDateChange={setFromDate}
              onReset={resetFilters}
            />

            {loading ? (
              <div className="space-y-3">
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#E5EEFF]" />
                <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
              </div>
            ) : error ? (
              <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
                <Activity className="h-10 w-10 text-[#94A3B8]" />
                <p className="mt-4 max-w-md text-sm text-[#64748B]">
                  {t("company.bookingsPage.loadError")}
                </p>
                <button
                  type="button"
                  onClick={reload}
                  className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
                >
                  {t("company.overview.retry")}
                </button>
              </div>
            ) : list.length === 0 ? (
              <CompanyBookingsEmptyState />
            ) : (
              <CompanyBookingsTable
                rows={list}
                lang={lang}
                selectedId={selected?.id ?? null}
                onSelect={handleSelect}
                total={pagination.total}
                page={pagination.page}
                limit={pagination.limit}
                totalPages={pagination.totalPages}
                canGoPrevious={pagination.hasPreviousPage}
                canGoNext={pagination.hasNextPage}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            )}
          </div>

          {/* Quick Inspect column */}
          <div className="lg:col-span-4">
            <CompanyBookingInspectDrawer row={selected} onClose={() => setSelectedId(null)} />
          </div>
        </div>

        {!loading && !error && list.length === 0 && (
          <div className="flex items-center gap-2 rounded-2xl border border-[#E5EEFF] bg-[#F8FAFF] px-4 py-3 text-xs text-[#565E74]">
            <Inbox className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
            {t("company.bookingsPage.empty.hint")}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyBookingsPage;