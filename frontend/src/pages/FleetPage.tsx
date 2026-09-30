import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router";
import { Car, ShieldCheck, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { useVehicles } from "../hooks/useVehicles";
import { useVehicleFilters } from "../hooks/useVehicleFilters";
import { mapVehicles } from "../lib/vehicleMapper";
import { CommandBar } from "../components/vehicles/CommandBar";
import { FilterSideBar } from "../components/vehicles/FilterSideBar";
import { VehicleCard } from "../components/vehicles/VehicleCard";
import {
  LOCATION_OPTIONS,
  BODY_PROFILES,
  DRIVETRAIN_OPTIONS,
  CERTIFIED_FLEETS,
  PERK_OPTIONS,
  SEGMENTS,
} from "../data/vehicleData";

const labelFor = (list: { id: string; label: string }[], ids: string[]) =>
  list.filter((x) => ids.includes(x.id)).map((x) => x.label);

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"];

const VehicleCardSkeleton: React.FC = () => (
  <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm flex flex-col xl:flex-row animate-pulse">
    <div className="xl:w-2/5 h-64 xl:h-auto bg-slate-200" />
    <div className="xl:w-3/5 p-6 flex flex-col gap-5">
      <div className="h-3 w-20 rounded bg-slate-200" />
      <div className="h-6 w-2/3 rounded bg-slate-200" />
      <div className="h-9 w-full rounded-xl bg-slate-100" />
      <div className="h-4 w-1/2 rounded bg-slate-200" />
    </div>
  </div>
);

export const FleetPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Location + dates chosen in the home search console. Passed straight to the
  // backend so availability is evaluated server-side against the booking
  // calendar rather than filtered client-side.
  const searchLocation = searchParams.get("location") ?? "";
  const searchStart = searchParams.get("startDate") ?? "";
  const searchEnd = searchParams.get("endDate") ?? "";
  const hasSearch = Boolean(searchLocation || searchStart || searchEnd);

  const { vehicles: dtoVehicles, loading, error, reload } = useVehicles({
    location: searchLocation || undefined,
    startDate: searchStart || undefined,
    endDate: searchEnd || undefined,
  });

  // Re-maps whenever the resolved locale changes, since enum labels are
  // translated during the projection. `t` changes identity on languageChanged.
  const allVehicles = useMemo(
    () => mapVehicles(dtoVehicles, (key, fallback) => t(key, fallback)),
    [dtoVehicles, t],
  );

  const filters = useVehicleFilters(allVehicles);
  const { filteredVehicles, segmentCounts } = filters;

  const [sort, setSort] = useState("recommended");

  const vehicles = useMemo(() => {
    const list = [...filteredVehicles];
    if (sort === "price-desc") list.sort((a, b) => b.pricePerDay - a.pricePerDay);
    if (sort === "price-asc") list.sort((a, b) => a.pricePerDay - b.pricePerDay);
    if (sort === "rating") {
      list.sort((a, b) =>
        (b.operator.isVerified ? 1 : 0) + b.operator.rating >
        (a.operator.isVerified ? 1 : 0) + a.operator.rating
          ? 1
          : -1,
      );
    }
    return list;
  }, [filteredVehicles, sort]);

  const singleLocation = labelFor(LOCATION_OPTIONS, filters.selectedLocations)[0];

  const months = t("home.search.months").split(" ");
  const fmtShortDate = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? iso
      : `${d.getDate()} ${months[d.getMonth()]}`;
  };

  const locationParam = searchLocation
    ? t("fleet.tokens.location", { name: searchLocation })
    : filters.selectedLocations.length === 0
      ? t("fleet.params.allHubs")
      : filters.selectedLocations.length === 1 && singleLocation
        ? t(singleLocation)
        : t("fleet.params.locationsCount", { count: filters.selectedLocations.length });

  const scheduleParam =
    searchStart && searchEnd
      ? t("fleet.params.dateRange", {
          start: fmtShortDate(searchStart),
          end: fmtShortDate(searchEnd),
        })
      : t("fleet.params.flexibleDates");

  const selectedSegment = filters.segment
    ? SEGMENTS.find((s) => s.id === filters.segment)
    : undefined;

  const tierParam = selectedSegment
    ? t(selectedSegment.label)
    : t("fleet.params.allCategories");

  const tokenRows: { label: string; onRemove: () => void }[] = [];

  if (selectedSegment) {
    tokenRows.push({
      label: t(selectedSegment.label),
      onRemove: () => filters.setSegment(null),
    });
  }
  filters.selectedLocations.forEach((id) => {
    const l = LOCATION_OPTIONS.find((x) => x.id === id);
    if (l) {
      tokenRows.push({
        label: t("fleet.tokens.location", { name: t(l.label) }),
        onRemove: () => filters.removeLocation(id),
      });
    }
  });
  filters.selectedBodies.forEach((id) => {
    const b = BODY_PROFILES.find((x) => x.id === id);
    if (b) {
      tokenRows.push({
        label: t(b.label),
        onRemove: () => filters.removeBody(id),
      });
    }
  });
  filters.selectedDrives.forEach((id) => {
    const d = DRIVETRAIN_OPTIONS.find((x) => x.id === id);
    if (d) {
      tokenRows.push({
        label: t(d.label),
        onRemove: () => filters.removeDrive(id),
      });
    }
  });
  filters.selectedOperators.forEach((id) => {
    const f = CERTIFIED_FLEETS.find((x) => x.id === id);
    if (f) {
      tokenRows.push({
        label: t("fleet.tokens.fleet", { name: f.name }),
        onRemove: () => filters.removeOperator(id),
      });
    }
  });
  filters.selectedPerks.forEach((id) => {
    const p = PERK_OPTIONS.find((x) => x.id === id);
    if (p) {
      tokenRows.push({
        label: t(p.label),
        onRemove: () => filters.removePerk(id),
      });
    }
  });

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {/* Page header */}
      <div className="bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1.5">
                {t("fleet.breadcrumb")}
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold text-white">{t("fleet.title")}</h1>
              <p className="mt-2 text-sm text-slate-400 max-w-xl">{t("fleet.subtitle")}</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-white text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {t("fleet.verifiedMatch", { count: filteredVehicles.length })}
            </div>
          </div>
        </div>
      </div>

      <CommandBar
        params={[
          { label: t("fleet.params.location"), value: locationParam },
          { label: t("fleet.params.schedule"), value: scheduleParam },
          { label: t("fleet.params.tier"), value: tierParam },
        ]}
        segment={filters.segment}
        onSegmentChange={filters.setSegment}
        segmentCounts={segmentCounts}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar */}
          <div className="lg:col-span-4 xl:col-span-3">
            <FilterSideBar
              maxPrice={filters.maxPrice}
              onMaxPriceChange={filters.setMaxPrice}
              selectedLocations={filters.selectedLocations}
              onToggleLocation={filters.toggleLocation}
              selectedBodies={filters.selectedBodies}
              onToggleBody={filters.toggleBody}
              selectedDrives={filters.selectedDrives}
              onToggleDrive={filters.toggleDrive}
              selectedOperators={filters.selectedOperators}
              onToggleOperator={filters.toggleOperator}
              selectedPerks={filters.selectedPerks}
              onTogglePerk={filters.togglePerk}
              onReset={filters.resetFilters}
              resultCount={filteredVehicles.length}
            />
          </div>

          {/* Results */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6 min-w-0">
            {/* Results bar */}
            <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-[#0F172A]">
                    {t("fleet.results.title")}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-bold text-[#2563EB]">
                    {t("fleet.results.availableCount", { count: filteredVehicles.length })}
                  </span>
                </div>
                <p className="text-[13px] text-slate-500">
                  {t("fleet.results.telemetryNote")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {t("fleet.results.sortBy")}
                </span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs font-semibold px-3.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="recommended">{t("fleet.sort.recommended")}</option>
                  <option value="price-desc">{t("fleet.sort.priceDesc")}</option>
                  <option value="price-asc">{t("fleet.sort.priceAsc")}</option>
                  <option value="rating">{t("fleet.sort.rating")}</option>
                </select>
              </div>
            </div>

            {/* Active filter tokens */}
            {tokenRows.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {tokenRows.map((t) => (
                  <div
                    key={t.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 text-xs shadow-sm"
                  >
                    <span>{t.label}</span>
                    <button
                      type="button"
                      onClick={t.onRemove}
                      className="text-slate-400 hover:text-[#2563EB]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={filters.resetFilters}
                  className="text-xs font-semibold text-[#2563EB] hover:underline px-2"
                >
                  {t("fleet.results.clearAll")}
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
                <span className="sr-only">{t("fleet.loading.label")}</span>
                {SKELETON_KEYS.map((key) => (
                  <VehicleCardSkeleton key={key} />
                ))}
              </div>
            )}

            {/* API error */}
            {!loading && error && (
              <div className="bg-[#FFFFFF] border border-red-200 rounded-2xl shadow-sm px-6 py-14 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  {t("fleet.error.title")}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{error}</p>
                <button
                  type="button"
                  onClick={reload}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                >
                  {t("fleet.error.retry")}
                </button>
              </div>
            )}

            {/* Loaded, but nothing matches the selected search or the database is empty */}
            {!loading && !error && allVehicles.length === 0 && (
              hasSearch ? (
                <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm px-6 py-16 text-center">
                  <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    {t("fleet.emptySearch.title")}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("fleet.emptySearch.desc")}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/fleet")}
                    className="mt-5 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                  >
                    {t("fleet.emptySearch.action")}
                  </button>
                </div>
              ) : (
                <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm px-6 py-16 text-center">
                  <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Car className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    {t("fleet.emptyDb.title")}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{t("fleet.emptyDb.desc")}</p>
                </div>
              )
            )}

            {/* Loaded with data, but filters exclude everything */}
            {!loading && !error && allVehicles.length > 0 && vehicles.length === 0 && (
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm px-6 py-16 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Car className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">{t("fleet.empty.title")}</h3>
                <p className="mt-1 text-sm text-slate-500">{t("fleet.empty.desc")}</p>
                <button
                  type="button"
                  onClick={filters.resetFilters}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                >
                  {t("fleet.empty.action")}
                </button>
              </div>
            )}

            {/* Cards */}
            {!loading && !error && vehicles.length > 0 && (
              <div className="flex flex-col gap-6">
                {vehicles.map((v) => (
                  <VehicleCard key={v.id} vehicle={v} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && !error && vehicles.length > 0 && (
              <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                <span className="text-[13px] text-slate-500">
                  {t("fleet.pagination.summary", {
                    range: `1 - ${vehicles.length}`,
                    total: vehicles.length,
                  })}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled
                    className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors disabled:opacity-40"
                  >
                    <ChevronLeft className="w-[18px] h-[18px] rtl:rotate-180" />
                  </button>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-sm"
                  >
                    1
                  </button>
                  <button
                    type="button"
                    disabled
                    className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors disabled:opacity-40"
                  >
                    <ChevronRight className="w-[18px] h-[18px] rtl:rotate-180" />
                  </button>
                </div>
              </div>
            )}

            {/* Trust banner */}
            <div className="bg-blue-50/60 border border-blue-200/80 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 mt-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">{t("fleet.trust.title")}</h3>
                  <p className="text-[13px] text-slate-600">{t("fleet.trust.desc")}</p>
                </div>
              </div>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="px-5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors shrink-0 shadow-sm"
              >
                {t("fleet.trust.learnMore")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetPage;