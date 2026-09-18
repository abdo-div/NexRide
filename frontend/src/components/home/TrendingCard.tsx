import React from "react";
import { Heart, Star, ArrowRight } from "lucide-react";
import type { TrendingCar } from "../../types/trendingCar";

interface TrendingCardProps {
  car: TrendingCar;
}

export const TrendingCard: React.FC<TrendingCardProps> = ({ car }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
      {/* Top Image Box */}
      <div className="relative w-full h-56 bg-slate-900 overflow-hidden">
        <img
          src={car.image}
          alt={car.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
        />

        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap max-w-[80%]">
          {car.badges.map((badge, idx) => (
            <span
              key={idx}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs backdrop-blur-md ${
                idx === 0
                  ? "bg-amber-500 text-white"
                  : "bg-slate-900/80 text-white border border-white/20"
              }`}
            >
              {badge}
            </span>
          ))}
        </div>

        {/* Saved Heart Button */}
        <button
          type="button"
          aria-label="Save car"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-700 hover:text-rose-500 hover:bg-white shadow-xs transition-colors"
        >
          <Heart className="w-4 h-4" />
        </button>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Partner Company & Rating */}
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-blue-600">
              {car.companyName} • {car.location}
            </span>
            <div className="flex items-center gap-1 font-bold text-slate-700">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{car.rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">
                ({car.reviewCount})
              </span>
            </div>
          </div>

          {/* Car Name & Year */}
          <h3 className="font-extrabold text-lg text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
            {car.title} ({car.year})
          </h3>

          {/* Specifications Bar */}
          <div className="grid grid-cols-4 gap-1 py-3 my-3 bg-slate-50/80 rounded-xl px-2 text-center border border-slate-100">
            {car.specs.map((spec, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {spec.label}
                </span>
                <span className="text-[11px] font-extrabold text-slate-700 mt-0.5">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing & Reservation Button */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              Daily Tariff
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900">
                {car.dailyPrice.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-600">
                {car.currency}
              </span>
            </div>
          </div>

          <a
            href={`#reserve-${car.id}`}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <span>Reserve Ride</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
