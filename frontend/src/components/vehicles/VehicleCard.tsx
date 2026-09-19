import React, { useState } from "react";
import { Link } from "react-router";
import { Heart, Star, Gauge, Armchair, Settings, Fuel, CheckCircle2 } from "lucide-react";
import type { Vehicle } from "../../types/vehicle";

const SPEC_META: { key: keyof Vehicle["specs"]; label: string; icon: React.ReactNode }[] = [
  { key: "engine", label: "Engine", icon: <Gauge className="w-[18px] h-[18px] text-slate-400" /> },
  { key: "seats", label: "Capacity", icon: <Armchair className="w-[18px] h-[18px] text-slate-400" /> },
  { key: "gearbox", label: "Gearbox", icon: <Settings className="w-[18px] h-[18px] text-slate-400" /> },
  { key: "fuel", label: "Fuel", icon: <Fuel className="w-[18px] h-[18px] text-slate-400" /> },
];

export const VehicleCard: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
  const [fav, setFav] = useState(!!vehicle.isFavorite);

  return (
    <article className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col xl:flex-row group">
      <div className="xl:w-2/5 relative h-64 xl:h-auto overflow-hidden bg-slate-100">
        <img
          src={vehicle.image}
          alt={vehicle.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4 flex flex-col gap-1.5">
          {vehicle.isInstantConfirmation && (
            <span className="px-3 py-1 rounded-full bg-[#F97316] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              Instant Confirmation
            </span>
          )}
          {vehicle.isTopPick && (
            <span className="px-3 py-1 rounded-full bg-[#F97316]/95 backdrop-blur-md text-white border border-amber-500/70 text-[10px] font-bold uppercase tracking-wider shadow-sm">
              Top Executive Pick
            </span>
          )}
          {vehicle.badgeTag && !vehicle.isTopPick && (
            <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#0F172A] border border-[#E2E8F0] text-[10px] font-bold uppercase tracking-wider shadow-sm">
              {vehicle.badgeTag}
            </span>
          )}
          {vehicle.badgeTagSecondary && (
            <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#2563EB] border border-[#E2E8F0] text-[10px] font-bold uppercase tracking-wider shadow-sm">
              {vehicle.badgeTagSecondary}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFav((f) => !f)}
          aria-label="Toggle favorite"
          className="absolute top-4 right-4 p-2 rounded-full bg-white/90 backdrop-blur-md text-slate-600 hover:text-red-500 border border-[#E2E8F0] shadow-sm transition-colors"
        >
          <Heart className={`w-[20px] h-[20px] ${fav ? "fill-red-500 text-red-500" : ""}`} />
        </button>
      </div>

      <div className="xl:w-3/5 p-6 flex flex-col justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                {vehicle.category}
              </span>
              <h2 className="text-xl font-bold text-[#0F172A] mt-0.5">{vehicle.title}</h2>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-[#0F172A] tracking-tight tabular-nums">
                {vehicle.pricePerDay.toLocaleString()} LYD
              </div>
              <span className="text-[11px] text-slate-500">
                / day · {vehicle.totalForPeriod.toLocaleString()} LYD {vehicle.periodDays}-days
              </span>
            </div>
          </div>

          {/* Partner accreditation */}
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-[10px] text-[#2563EB]">
              {vehicle.operator.initials}
            </div>
            <span className="text-sm font-semibold text-slate-800">{vehicle.operator.name}</span>
            <span className="text-slate-300 text-xs">•</span>
            <div className="flex items-center text-[#F97316] text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-[#F97316] text-[#F97316] mr-0.5" />
              {vehicle.operator.rating} ({vehicle.operator.reviewsCount} reviews)
            </div>
            {vehicle.operator.isVerified && (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-100 border border-[#E2E8F0] text-[10px] font-medium text-slate-600">
                Verified Partner
              </span>
            )}
          </div>
        </div>

        {/* Specs grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 px-4 rounded-xl bg-slate-50 border border-[#E2E8F0]">
          {SPEC_META.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              {s.icon}
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-slate-500">{s.label}</span>
                <span className="text-[11px] font-bold text-[#0F172A]">
                  {vehicle.specs[s.key]}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Perks & CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[#E2E8F0]">
          <div className="flex flex-col gap-1">
            {vehicle.perks.map((perk, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0" />
                {perk}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={`/cars/${vehicle.id}`}
              className="px-4 py-2.5 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-sm"
            >
              Details
            </Link>
            <Link
              to={`/cars/${vehicle.id}`}
              className="px-6 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-sm hover:bg-blue-700 active:scale-[0.99] transition-all inline-flex items-center"
            >
              Reserve ({vehicle.totalForPeriod.toLocaleString()} LYD)
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};