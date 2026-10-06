import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, CarFront } from "lucide-react";
import { useCompanyFleet } from "../../hooks/useCompanyFleet";
import { saveBlobAsFile } from "../../lib/bookingView";
import { CompanyFleetHeader } from "../../components/company/CompanyFleetHeader";
import { CompanyFleetKpiCards } from "../../components/company/CompanyFleetKpiCards";
import { CompanyFleetToolbar } from "../../components/company/CompanyFleetToolbar";
import { CompanyFleetTable } from "../../components/company/CompanyFleetTable";
import { CompanyFleetGrid } from "../../components/company/CompanyFleetGrid";
import { CompanyFleetPagination } from "../../components/company/CompanyFleetPagination";
import { CompanyFleetInspectDrawer } from "../../components/company/CompanyFleetInspectDrawer";
import { CompanyFleetEmptyState } from "../../components/company/CompanyFleetEmptyState";
import type { CompanyFleetVehicle } from "../../types/companyFleet";

const csvHeaders = [
  "Code",
  "Make",
  "Model",
  "Year",
  "Category",
  "Status",
  "City",
  "Pickup Location",
  "Transmission",
  "Fuel",
  "Weekly Rate (LYD)",
  "Daily Rate (LYD)",
  "Completed Bookings",
  "Avg Rating",
  "Reviews",
  "GPS Active",
];

const csv = (list: CompanyFleetVehicle[]): string => {
  const rows = list.map((row) => [
    row.code,
    row.make,
    row.model,
    row.year ?? "",
    row.type ?? "",
    row.displayStatus,
    row.city ?? "",
    row.pickupLocation ?? "",
    row.transmission ?? "",
    row.fuelType ?? "",
    row.weeklyPrice ?? "",
    row.dailyPrice,
    String(row.bookings),
    row.rating.average ?? "",
    String(row.rating.count),
    row.gpsActive ? "TRUE" : "",
  ]);
  return [csvHeaders.join(","), ...rows.map((r) => r.join(","))].join("\n");
};

/** Fleet & Vehicles register — live posture deck, list/grid and Quick Inspect. */
export const CompanyFleetPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    data,
    loading,
    error,
    reload,
    search,
    setSearch,
    status,
    setStatus,
    category,
    setCategory,
    transmission,
    setTransmission,
    fuel,
    setFuel,
    city,
    setCity,
    setPage,
    resetFilters,
  } = useCompanyFleet();

  const [view, setView] = useState<"list" | "grid">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => data.list.find((row) => row.id === selectedId) ?? data.list[0] ?? null,
    [data.list, selectedId],
  );

  const handleSelect = useCallback((row: CompanyFleetVehicle) => {
    setSelectedId(row.id);
    setOpen(true);
  }, []);

  const toggleQuickInspect = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  const handleExport = useCallback(() => {
    if (data.list.length === 0) return;
    const sanitized = data.company?.name.replace(/\s+/g, "-").toLowerCase() ?? "fleet";
    saveBlobAsFile(
      new Blob([csv(data.list)], { type: "text/csv;charset=utf-8" }),
      `nexride-${sanitized}-fleet.csv`,
    );
  }, [data]);

  const availableCities = useMemo(
    () =>
      Array.from(new Set(data.list.map((row) => row.city).filter((c): c is string => Boolean(c))))
        .sort((a, b) => a.localeCompare(b)),
    [data.list],
  );

  const { summary, list, pagination } = data;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      <div className="flex flex-col gap-6">
        <CompanyFleetHeader data={data} loading={loading} onExport={handleExport} />

        <CompanyFleetKpiCards summary={summary} />

        <div className="flex flex-col gap-4">
          <CompanyFleetToolbar
            view={view}
            onViewChange={setView}
            quickInspectOn={open}
            onQuickInspect={toggleQuickInspect}
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
            category={category}
            onCategoryChange={setCategory}
            transmission={transmission}
            onTransmissionChange={setTransmission}
            fuel={fuel}
            onFuelChange={setFuel}
            city={city}
            onCityChange={setCity}
            onReset={resetFilters}
            availableCities={availableCities}
          />

          {loading ? (
            <div className="space-y-3">
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#E5EEFF]" />
              <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
              <Activity className="h-10 w-10 text-[#94A3B8]" />
              <p className="mt-4 max-w-md text-sm text-[#64748B]">
                {t("company.fleetPage.loadError")}
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
            <CompanyFleetEmptyState />
          ) : (
            <>
              {view === "list" ? (
                <CompanyFleetTable
                  rows={list}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                />
              ) : (
                <CompanyFleetGrid rows={list} onSelect={handleSelect} />
              )}
              <CompanyFleetPagination pagination={pagination} onPageChange={setPage} />
              <div className="text-xs text-[#9AA4B5]">
                {t("company.fleetPage.disclaimer")}
              </div>
            </>
          )}
        </div>

        {!loading && !error && list.length === 0 && (
          <div className="flex items-center gap-2 rounded-2xl border border-[#E5EEFF] bg-[#F8FAFF] px-4 py-3 text-xs text-[#565E74]">
            <CarFront className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
            {t("company.fleetPage.empty.hint")}
          </div>
        )}
      </div>

      <CompanyFleetInspectDrawer
        open={open}
        row={selected}
        company={data.company}
        onClose={() => setOpen(false)}
      />
    </div>
  );
};

export default CompanyFleetPage;