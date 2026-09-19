import React from "react";
import { Filter, Star, CheckSquare } from "lucide-react";
import {
  LOCATION_OPTIONS,
  BODY_PROFILES,
  DRIVETRAIN_OPTIONS,
  CERTIFIED_FLEETS,
  PERK_OPTIONS,
} from "../../data/vehicleData";

export interface FilterSelection {
  maxPrice: number;
  onMaxPriceChange: (n: number) => void;
  selectedLocations: string[];
  onToggleLocation: (id: string) => void;
  selectedBodies: string[];
  onToggleBody: (id: string) => void;
  selectedDrives: string[];
  onToggleDrive: (id: string) => void;
  selectedOperators: string[];
  onToggleOperator: (id: string) => void;
  selectedPerks: string[];
  onTogglePerk: (id: string) => void;
  onReset: () => void;
  resultCount: number;
}

const HISTOGRAM = [2, 4, 7, 9, 10, 8, 6, 4, 3, 2];

const BoxRow: React.FC<{
  checked: boolean;
  label: string;
  onToggle: () => void;
  trailing?: React.ReactNode;
}> = ({ checked, label, onToggle, trailing }) => (
  <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-[#E2E8F0] cursor-pointer transition-colors">
    <span className="flex items-center gap-2.5 text-[13px] font-medium text-slate-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="accent-[#2563EB] w-4 h-4 rounded focus:ring-blue-500 border-slate-300"
      />
      {label}
    </span>
    {trailing}
  </label>
);

export const FilterSideBar: React.FC<FilterSelection> = ({
  maxPrice,
  onMaxPriceChange,
  selectedLocations,
  onToggleLocation,
  selectedBodies,
  onToggleBody,
  selectedDrives,
  onToggleDrive,
  selectedOperators,
  onToggleOperator,
  selectedPerks,
  onTogglePerk,
  onReset,
  resultCount,
}) => (
  <aside className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#E2E8F0] shadow-sm flex flex-col gap-6 lg:sticky lg:top-40">
    {/* Header */}
    <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
      <div className="flex items-center gap-2">
        <Filter className="text-[#2563EB] w-5 h-5" />
        <span className="text-lg font-bold text-[#0F172A]">Filters</span>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-[#2563EB] transition-colors"
      >
        Reset All
      </button>
    </div>

    {/* Locations */}
    <div className="flex flex-col gap-3">
      <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
        Libyan Location
      </span>
      <div className="space-y-2">
        {LOCATION_OPTIONS.map((l) => (
          <BoxRow
            key={l.id}
            checked={selectedLocations.includes(l.id)}
            label={l.label}
            trailing={
              <span className="text-[10px] font-semibold text-slate-400">{l.count}</span>
            }
            onToggle={() => onToggleLocation(l.id)}
          />
        ))}
      </div>
    </div>

    {/* Rate per day */}
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
          Rate Per Day
        </span>
        <span className="text-xs font-bold text-[#2563EB]">
          100 - {maxPrice.toLocaleString()} LYD
        </span>
      </div>
      <div className="h-10 flex items-end gap-1 px-1 pt-2">
        {HISTOGRAM.map((h, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-sm ${i === 4 || i === 5 ? "bg-[#2563EB]" : i === 3 ? "bg-blue-200" : "bg-slate-200"}`}
            style={{ height: `${h * 10}%` }}
          />
        ))}
      </div>
      <input
        type="range"
        min={100}
        max={2500}
        step={50}
        value={maxPrice}
        onChange={(e) => onMaxPriceChange(Number(e.target.value))}
        className="w-full accent-[#2563EB] bg-slate-200 rounded-lg h-1.5 cursor-pointer"
      />
      <div className="flex justify-between text-[10px] font-semibold text-slate-500">
        <span>Min: 100 LYD</span>
        <span>Max: 2,500+ LYD</span>
      </div>
    </div>

    {/* Body profile */}
    <div className="flex flex-col gap-3">
      <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
        Body Profile
      </span>
      <div className="grid grid-cols-2 gap-2">
        {BODY_PROFILES.map((b) => (
          <label
            key={b.id}
            className="p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-[#E2E8F0] cursor-pointer flex items-center gap-2 text-[13px] font-medium text-slate-800 transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedBodies.includes(b.id)}
              onChange={() => onToggleBody(b.id)}
              className="accent-[#2563EB] w-4 h-4 rounded focus:ring-blue-500 border-slate-300"
            />
            <span>{b.label} ({b.count})</span>
          </label>
        ))}
      </div>
    </div>

    {/* Drivetrain & specs */}
    <div className="flex flex-col gap-3">
      <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
        Drivetrain &amp; Specs
      </span>
      <div className="space-y-2">
        {DRIVETRAIN_OPTIONS.map((d) => (
          <BoxRow
            key={d.id}
            checked={selectedDrives.includes(d.id)}
            label={d.label}
            trailing={
              <span className="text-[10px] font-semibold text-slate-400">{d.count}</span>
            }
            onToggle={() => onToggleDrive(d.id)}
          />
        ))}
      </div>
    </div>

    {/* Certified fleets */}
    <div className="flex flex-col gap-3">
      <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
        Certified Fleets
      </span>
      <div className="space-y-2">
        {CERTIFIED_FLEETS.map((f) => (
          <BoxRow
            key={f.id}
            checked={selectedOperators.includes(f.id)}
            label={f.name}
            trailing={
              <span className="text-[10px] font-bold text-[#F97316] flex items-center">
                <Star className="w-3 h-3 fill-[#F97316] text-[#F97316] mr-0.5" />
                {f.rating}
              </span>
            }
            onToggle={() => onToggleOperator(f.id)}
          />
        ))}
      </div>
    </div>

    {/* Reservation perks */}
    <div className="flex flex-col gap-3">
      <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
        Reservation Perks
      </span>
      <div className="space-y-2">
        {PERK_OPTIONS.map((p) => (
          <label
            key={p.id}
            className="flex items-center gap-2 text-[13px] font-medium text-slate-800 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedPerks.includes(p.id)}
              onChange={() => onTogglePerk(p.id)}
              className="accent-[#2563EB] w-4 h-4 rounded focus:ring-blue-500 border-slate-300"
            />
            <CheckSquare className="w-3.5 h-3.5 text-slate-300" />
            <span>{p.label}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Apply CTA */}
    <button
      type="button"
      className="w-full py-3 rounded-xl bg-[#2563EB] text-white text-sm font-bold shadow-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
    >
      Apply Filters ({resultCount} Cars)
    </button>
  </aside>
);