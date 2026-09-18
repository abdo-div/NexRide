import React from "react";
import { Heart, Fuel, Gauge, Users, MapPin, CheckCircle2 } from "lucide-react";
import type { Car } from "../../types/car";

interface CarCardProps {
  car: Car;
}

export const CarCard: React.FC<CarCardProps> = ({ car }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
      {/* Card Header & Image */}
      <div className="relative w-full h-52 bg-slate-100 overflow-hidden">
        <img
          src={car.image}
          alt={car.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-800 shadow-xs">
          {car.isVerified && (
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          )}
          <span>{car.type}</span>
        </div>

        <button
          type="button"
          aria-label="Save car"
          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-md text-slate-600 hover:text-rose-500 hover:bg-white shadow-xs transition-colors"
        >
          <Heart className="w-4 h-4" />
        </button>

        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-slate-900/70 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
          <MapPin className="w-3 h-3 text-blue-400" />
          <span>{car.location}</span>
        </div>
      </div>

      {/* Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {car.brand} • {car.year}
          </div>
          <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
            {car.name}
          </h3>

          <div className="grid grid-cols-3 gap-2 py-3.5 my-3 border-y border-slate-100 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-slate-400" />
              <span>{car.transmission}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5 text-slate-400" />
              <span>{car.fuelType}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{car.seats} Seats</span>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-center justify-between pt-1 mt-auto">
          <div>
            <span className="text-xs text-slate-500 font-medium">
              Starting from
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-blue-600">
                {car.pricePerDay}
              </span>
              <span className="text-xs font-bold text-slate-700">
                {car.currency} / day
              </span>
            </div>
          </div>

          <a
            href={`#book-${car.id}`}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all active:scale-95"
          >
            Rent Now
          </a>
        </div>
      </div>
    </div>
  );
};
