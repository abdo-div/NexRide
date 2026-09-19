import React, { useMemo, useState } from "react";
import { Car, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useVehicleFilters } from "../hooks/useVehicleFilters";
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

export const FleetPage: React.FC = () => {
  const filters = useVehicleFilters();
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

  const locationParam =
    filters.selectedLocations.length === 0
      ? "All hubs"
      : filters.selectedLocations.length === 1
        ? labelFor(LOCATION_OPTIONS, filters.selectedLocations)[0]
        : `${filters.selectedLocations.length} locations`;

  const tierParam = filters.segment
    ? SEGMENTS.find((s) => s.id === filters.segment)?.label ?? "All Categories"
    : "All Categories";

  const tokenRows: { label: string; onRemove: () => void }[] = [];

  if (filters.segment) {
    const s = SEGMENTS.find((x) => x.id === filters.segment);
    if (s) {
      tokenRows.push({ label: s.label, onRemove: () => filters.setSegment(null) });
    }
  }
  filters.selectedLocations.forEach((id) => {
    const l = LOCATION_OPTIONS.find((x) => x.id === id);
    if (l) {
      tokenRows.push({
        label: `Location: ${l.label}`,
        onRemove: () => filters.removeLocation(id),
      });
    }
  });
  filters.selectedBodies.forEach((id) => {
    const b = BODY_PROFILES.find((x) => x.id === id);
    if (b) {
      tokenRows.push({
        label: b.label,
        onRemove: () => filters.removeBody(id),
      });
    }
  });
  filters.selectedDrives.forEach((id) => {
    const d = DRIVETRAIN_OPTIONS.find((x) => x.id === id);
    if (d) {
      tokenRows.push({
        label: d.label,
        onRemove: () => filters.removeDrive(id),
      });
    }
  });
  filters.selectedOperators.forEach((id) => {
    const f = CERTIFIED_FLEETS.find((x) => x.id === id);
    if (f) {
      tokenRows.push({
        label: `Fleet: ${f.name}`,
        onRemove: () => filters.removeOperator(id),
      });
    }
  });
  filters.selectedPerks.forEach((id) => {
    const p = PERK_OPTIONS.find((x) => x.id === id);
    if (p) {
      tokenRows.push({
        label: p.label,
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
                Fleet / Explore Cars
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold text-white">Our Fleet</h1>
              <p className="mt-2 text-sm text-slate-400 max-w-xl">
                Real-time availability confirmed with telemetry synchronization across
                every NexRide pick-up hub.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-white text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {filteredVehicles.length} verified vehicle
              {filteredVehicles.length === 1 ? "" : "s"} match your filters
            </div>
          </div>
        </div>
      </div>

      <CommandBar
        params={[
          { label: "Location", value: locationParam },
          { label: "Schedule", value: "Flexible dates · 5 days" },
          { label: "Fleet Tier", value: tierParam },
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
                  <h2 className="text-2xl font-bold text-[#0F172A]">Vehicles in Tripoli</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-bold text-[#2563EB]">
                    {filteredVehicles.length} Available
                  </span>
                </div>
                <p className="text-[13px] text-slate-500">
                  Real-time availability confirmed with telemetry synchronization.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Sort by:
                </span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs font-semibold px-3.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="recommended">Recommended for VIP</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="rating">Highest Fleet Rating</option>
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
                  Clear all
                </button>
              </div>
            )}

            {/* Cards */}
            {vehicles.length === 0 ? (
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm px-6 py-16 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Car className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  No vehicles match your filters
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Try raising the max price or removing some filters.
                </p>
                <button
                  type="button"
                  onClick={filters.resetFilters}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} />)
            )}

            {/* Pagination */}
            <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <span className="text-[13px] text-slate-500">
                Showing <strong className="text-[#0F172A] font-bold">1 - {vehicles.length}</strong>{" "}
                of <strong className="text-[#0F172A] font-bold">{vehicles.length}</strong> verified vehicles
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled
                  className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors disabled:opacity-40"
                >
                  <ChevronLeft className="w-[18px] h-[18px]" />
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
                  <ChevronRight className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>

            {/* Trust banner */}
            <div className="bg-blue-50/60 border border-blue-200/80 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 mt-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    NexRide Guarantee &amp; Road Rescue
                  </h3>
                  <p className="text-[13px] text-slate-600">
                    Every rental is secured with GPS recovery, licensed commercial
                    liability, and 24/7 Tripoli rapid replacement units.
                  </p>
                </div>
              </div>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="px-5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors shrink-0 shadow-sm"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetPage;