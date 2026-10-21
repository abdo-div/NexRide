import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router";
import { Car, ShieldCheck, ChevronLeft, ChevronRight, AlertTriangle, SlidersHorizontal, X, Sparkles, Headphones, BadgeCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useVehicles } from "../hooks/useVehicles";
import { useVehicleFilters } from "../hooks/useVehicleFilters";
import { mapVehicles } from "../lib/vehicleMapper";
import { CommandBar } from "../components/vehicles/CommandBar";
import { FilterSideBar } from "../components/vehicles/FilterSideBar";
import { VehicleCard } from "../components/vehicles/VehicleCard";
import {
  BODY_PROFILES,
  DRIVETRAIN_OPTIONS,
  CERTIFIED_FLEETS,
  PERK_OPTIONS,
  SEGMENTS,
} from "../data/vehicleData";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"];

const VehicleCardSkeleton: React.FC = () => (
  <div className="skeleton-shimmer flex flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm xl:flex-row">
    <div className="h-64 bg-slate-200/80 xl:h-auto xl:w-2/5" />
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Location + dates chosen in the home search console. Passed straight to the
  // backend so availability is evaluated server-side against the booking
  // calendar rather than filtered client-side.
  const searchLocation = searchParams.get("location") ?? "";
  const searchStart = searchParams.get("startDate") ?? "";
  const searchEnd = searchParams.get("endDate") ?? "";
  const companyParam = searchParams.get("company") ?? "";
  const categoryParam = searchParams.get("category") ?? "";
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
  const {
    filteredVehicles,
    segmentCounts,
    locationOptions,
    bodyOptions,
    driveOptions,
    operatorOptions,
    perkOptions,
  } = filters;

  const [sort, setSort] = useState("recommended");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // A single sidebar location selection is pushed back into the URL `location`
  // param so the search API applies real booking availability server-side. The
  // flag keeps the home-search context intact until the user actually touches
  // the sidebar location filters.
  const locationTouched = useRef(false);
  const handleToggleLocation = (id: string) => {
    locationTouched.current = true;
    filters.toggleLocation(id);
  };

  useEffect(() => {
    if (!locationTouched.current) return;
    const desired =
      filters.selectedLocations.length === 1
        ? filters.selectedLocations[0]
        : null;
    const current = searchParams.get("location") ?? null;
    if (desired === current) return;
    const next = new URLSearchParams(searchParams);
    if (desired) next.set("location", desired);
    else next.delete("location");
    setSearchParams(next, { replace: true });
  }, [filters.selectedLocations, searchParams, setSearchParams]);

  const vehicles = useMemo(() => {
    const companyScoped = companyParam
      ? filteredVehicles.filter((v) => v.operatorId === companyParam)
      : filteredVehicles;
    const scoped = companyScoped.filter((vehicle) => {
      switch (categoryParam) {
        case "economy":
          return ["SEDAN", "HATCHBACK"].includes(vehicle.vehicleType);
        case "executive-suv":
          return vehicle.vehicleType === "SUV";
        case "ultra-luxury":
          return vehicle.vehicleType === "LUXURY";
        case "desert-4x4":
          return vehicle.vehicleType === "PICKUP";
        case "electric-hybrid":
          return ["ELECTRIC", "HYBRID"].includes(vehicle.fuelType);
        default:
          return true;
      }
    });
    const list = [...scoped];
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
  }, [filteredVehicles, sort, companyParam, categoryParam]);

  const singleLocation =
    filters.selectedLocations.length === 1 ? filters.selectedLocations[0] : "";

  const months = t("home.search.months").split(" ");
  const fmtShortDate = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? iso
      : `${d.getDate()} ${months[d.getMonth()]}`;
  };

  const locationParam = searchLocation
    ? t("fleet.tokens.location", { name: searchLocation })
    : singleLocation
      ? t("fleet.tokens.location", { name: singleLocation })
      : filters.selectedLocations.length > 1
        ? t("fleet.params.locationsCount", { count: filters.selectedLocations.length })
        : t("fleet.params.allHubs");

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

  if (categoryParam) {
    const categoryKey: Record<string, string> = {
      economy: "data.categories.economy.title",
      "executive-suv": "data.categories.executiveSuv.title",
      "ultra-luxury": "data.categories.ultraLuxury.title",
      "desert-4x4": "data.categories.desert4x4.title",
      "electric-hybrid": "data.categories.electricHybrid.title",
    };
    tokenRows.push({
      label: t(categoryKey[categoryParam] ?? "fleet.params.allCategories"),
      onRemove: () => {
        const next = new URLSearchParams(searchParams);
        next.delete("category");
        setSearchParams(next, { replace: true });
      },
    });
  }

  if (companyParam) {
    const scopedCompany =
      allVehicles.find((v) => v.operatorId === companyParam)?.operator.name ??
      companyParam;
    tokenRows.push({
      label: t("fleet.tokens.company", { name: scopedCompany }),
      onRemove: () => {
        const next = new URLSearchParams(searchParams);
        next.delete("company");
        setSearchParams(next, { replace: true });
      },
    });
  }

  if (selectedSegment) {
    tokenRows.push({
      label: t(selectedSegment.label),
      onRemove: () => filters.setSegment(null),
    });
  }
  filters.selectedLocations.forEach((id) => {
    const l = locationOptions.find((x) => x.id === id);
    tokenRows.push({
      label: t("fleet.tokens.location", { name: l ? t(l.label) : id }),
      onRemove: () => filters.removeLocation(id),
    });
  });
  filters.selectedBodies.forEach((id) => {
    const b = bodyOptions.find((x) => x.id === id) ?? BODY_PROFILES.find((x) => x.id === id);
    if (b) {
      tokenRows.push({
        label: t(b.label),
        onRemove: () => filters.removeBody(id),
      });
    }
  });
  filters.selectedDrives.forEach((id) => {
    const d = driveOptions.find((x) => x.id === id) ?? DRIVETRAIN_OPTIONS.find((x) => x.id === id);
    if (d) {
      tokenRows.push({
        label: t(d.label),
        onRemove: () => filters.removeDrive(id),
      });
    }
  });
  filters.selectedOperators.forEach((id) => {
    const f =
      operatorOptions.find((x) => x.id === id) ??
      CERTIFIED_FLEETS.find((x) => x.id === id);
    if (f) {
      tokenRows.push({
        label: t("fleet.tokens.fleet", { name: f.name }),
        onRemove: () => filters.removeOperator(id),
      });
    }
  });
  filters.selectedPerks.forEach((id) => {
    const p = perkOptions.find((x) => x.id === id) ?? PERK_OPTIONS.find((x) => x.id === id);
    if (p) {
      tokenRows.push({
        label: t(p.label),
        onRemove: () => filters.removePerk(id),
      });
    }
  });

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_45%,#f8fafc_100%)]">
      {/* Page header */}
      <div className="relative overflow-hidden bg-[#071426]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(59,130,246,.24),transparent_35%),radial-gradient(circle_at_85%_70%,rgba(249,115,22,.14),transparent_30%)]" />
        <div className="absolute -end-24 top-8 h-72 w-72 rounded-full border border-white/10" />
        <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-32 lg:px-8 lg:pb-14">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-blue-300">
                <Sparkles className="h-3.5 w-3.5" />
                {t("fleet.breadcrumb")}
              </p>
              <h1 className="text-4xl font-black tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">{t("fleet.title")}</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">{t("fleet.subtitle")}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.07] px-4 py-3 text-white backdrop-blur-xl sm:col-span-3">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <span className="text-xs font-semibold">{t("fleet.verifiedMatch", { count: companyParam ? vehicles.length : filteredVehicles.length })}</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.05] px-3 py-2.5 text-[11px] font-semibold text-slate-200"><BadgeCheck className="h-4 w-4 text-blue-300" />{t("fleet.hero.verified")}</div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.05] px-3 py-2.5 text-[11px] font-semibold text-slate-200"><Headphones className="h-4 w-4 text-orange-300" />{t("fleet.hero.support")}</div>
              <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[.05] px-3 py-2.5 text-[11px] font-semibold text-slate-200 sm:flex"><Car className="h-4 w-4 text-emerald-300" />{t("fleet.hero.ready")}</div>
            </div>
          </div>
        </div>
      </div>

      <CommandBar
        params={[
          {
            label: t("fleet.params.location"),
            value: locationParam,
            onClick: () => {
              if (window.matchMedia("(max-width: 1023px)").matches) {
                setMobileFiltersOpen(true);
              } else {
                document.getElementById("fleet-filter-panel")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            },
          },
          {
            label: t("fleet.params.schedule"),
            value: scheduleParam,
            onClick: () => {
              if (window.matchMedia("(max-width: 1023px)").matches) {
                setMobileFiltersOpen(true);
              } else {
                document.getElementById("fleet-filter-panel")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            },
          },
          {
            label: t("fleet.params.tier"),
            value: tierParam,
            onClick: () => {
              if (window.matchMedia("(max-width: 1023px)").matches) {
                setMobileFiltersOpen(true);
              } else {
                document.getElementById("fleet-filter-panel")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            },
          },
        ]}
        segment={filters.segment}
        onSegmentChange={(segId) => {
          if (categoryParam) {
            const next = new URLSearchParams(searchParams);
            next.delete("category");
            setSearchParams(next, { replace: true });
          }
          filters.setSegment(segId);
        }}
        segmentCounts={segmentCounts}
        onOpenFilters={() => {
          if (window.matchMedia("(max-width: 1023px)").matches) {
            setMobileFiltersOpen(true);
          } else {
            document.getElementById("fleet-filter-panel")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }}
      />

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar */}
          <div id="fleet-filter-panel" className="hidden scroll-mt-24 lg:block lg:col-span-4 xl:col-span-3">
            <FilterSideBar
              maxPrice={filters.maxPrice}
              onMaxPriceChange={filters.setMaxPrice}
              minPrice={filters.priceMin}
              totalMaxPrice={filters.priceMax}
              locations={locationOptions}
              selectedLocations={filters.selectedLocations}
              onToggleLocation={handleToggleLocation}
              bodies={bodyOptions}
              selectedBodies={filters.selectedBodies}
              onToggleBody={filters.toggleBody}
              drives={driveOptions}
              selectedDrives={filters.selectedDrives}
              onToggleDrive={filters.toggleDrive}
              operators={operatorOptions}
              selectedOperators={filters.selectedOperators}
              onToggleOperator={filters.toggleOperator}
              perks={perkOptions}
              selectedPerks={filters.selectedPerks}
              onTogglePerk={filters.togglePerk}
              onReset={filters.resetFilters}
              resultCount={filteredVehicles.length}
            />
          </div>

          {/* Results */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6 min-w-0">
            {/* Results bar */}
            <div className="premium-card flex flex-col justify-between gap-5 p-5 md:flex-row md:items-center md:p-6">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black tracking-tight text-[#0F172A]">
                    {t("fleet.results.title")}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-[#142B4A]">
                    {t("fleet.results.availableCount", {
                      count: companyParam ? vehicles.length : filteredVehicles.length,
                    })}
                  </span>
                </div>
                <p className="text-[13px] text-slate-500">
                  {t("fleet.results.telemetryNote")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="inline-flex lg:hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#142B4A] shadow-sm"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {t("fleet.filters.title")}
                  {tokenRows.length > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#142B4A] px-1 text-[10px] text-white">
                      {tokenRows.length}
                    </span>
                  )}
                </button>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {t("fleet.results.sortBy")}
                </span>
                <label className="sr-only" htmlFor="fleet-sort">{t("fleet.results.sortBy")}</label>
                <select
                  id="fleet-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="premium-field min-w-44 cursor-pointer px-3.5 py-2.5 text-xs font-semibold text-slate-800"
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
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#142B4A]"
                  >
                    <span>{t.label}</span>
                    <button
                      type="button"
                      onClick={t.onRemove}
                      className="grid h-5 w-5 place-items-center rounded-full text-slate-400 hover:bg-white hover:text-[#142B4A]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={filters.resetFilters}
                  className="text-xs font-semibold text-[#142B4A] hover:underline px-2"
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
                  className="mt-5 px-5 py-2.5 rounded-xl bg-[#142B4A] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
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
                    className="mt-5 px-5 py-2.5 rounded-xl bg-[#142B4A] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
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

            {/* Company filter set, but that operator has no available vehicles */}
            {!loading && !error && allVehicles.length > 0 && vehicles.length === 0 && companyParam && (
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm px-6 py-16 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Car className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  {t("fleet.emptyCompany.title")}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {t("fleet.emptyCompany.desc")}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/companies")}
                    className="px-5 py-2.5 rounded-xl bg-[#142B4A] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                  >
                    {t("fleet.emptyCompany.back")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new URLSearchParams(searchParams);
                      next.delete("company");
                      setSearchParams(next, { replace: true });
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                  >
                    {t("fleet.emptyCompany.clearCompany")}
                  </button>
                </div>
              </div>
            )}

            {/* Loaded with data, but filters exclude everything */}
            {!loading && !error && allVehicles.length > 0 && vehicles.length === 0 && !companyParam && (
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm px-6 py-16 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Car className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">{t("fleet.empty.title")}</h3>
                <p className="mt-1 text-sm text-slate-500">{t("fleet.empty.desc")}</p>
                <button
                  type="button"
                  onClick={filters.resetFilters}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-[#142B4A] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
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
                    aria-current="page"
                    disabled
                    className="w-9 h-9 rounded-xl bg-[#142B4A] text-white text-xs font-bold shadow-sm"
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
            <div className="bg-slate-50/60 border border-slate-200/80 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 mt-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#142B4A] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">{t("fleet.trust.title")}</h3>
                  <p className="text-[13px] text-slate-600">{t("fleet.trust.desc")}</p>
                </div>
              </div>
              <a
                href="#contact"
                className="px-5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors shrink-0 shadow-sm"
              >
                {t("fleet.trust.learnMore")}
              </a>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileFiltersOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end bg-slate-950/45 p-0 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileFiltersOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t("fleet.filters.title")}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              onClick={(event) => event.stopPropagation()}
              className="relative max-h-[88dvh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-4 shadow-2xl"
            >
              <div className="sticky top-0 z-10 mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl">
                <div>
                  <p className="text-sm font-black text-slate-900">{t("fleet.filters.title")}</p>
                  <p className="text-[11px] text-slate-500">{t("fleet.filters.apply", { count: filteredVehicles.length })}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700"
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <FilterSideBar
                maxPrice={filters.maxPrice}
                onMaxPriceChange={filters.setMaxPrice}
                minPrice={filters.priceMin}
                totalMaxPrice={filters.priceMax}
                locations={locationOptions}
                selectedLocations={filters.selectedLocations}
                onToggleLocation={handleToggleLocation}
                bodies={bodyOptions}
                selectedBodies={filters.selectedBodies}
                onToggleBody={filters.toggleBody}
                drives={driveOptions}
                selectedDrives={filters.selectedDrives}
                onToggleDrive={filters.toggleDrive}
                operators={operatorOptions}
                selectedOperators={filters.selectedOperators}
                onToggleOperator={filters.toggleOperator}
                perks={perkOptions}
                selectedPerks={filters.selectedPerks}
                onTogglePerk={filters.togglePerk}
                onReset={filters.resetFilters}
                resultCount={filteredVehicles.length}
                sticky={false}
                onApply={() => setMobileFiltersOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FleetPage;
