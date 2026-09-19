import React from "react";
import { Phone, Star, BadgeCheck } from "lucide-react";
import { ConfirmationIcon } from "./ConfirmationIcon";
import type { ConfirmationData } from "../../types/bookingConfirmation";

export const VehicleConfirmationCard: React.FC<{ data: ConfirmationData }> = ({ data }) => {
  const { vehicle, meta } = data;
  const { vehicleCard, operator } = meta;
  const chips = [
    { icon: "speed", text: vehicle.specs.engine },
    { icon: "infinity", text: "AWD 4MATIC" },
    { icon: "seat", text: vehicle.specs.seats },
    { icon: "settings", text: vehicle.specs.gearbox },
  ] as const;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="relative w-full h-64 sm:h-80 bg-slate-100 overflow-hidden">
        <img src={vehicle.image} alt={vehicle.title} className="w-full h-full object-cover" />
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-[#0F172A] shadow-sm">
            {vehicleCard.badgePrimary}
          </span>
          <span className="bg-[#2563EB] px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-sm">
            {vehicleCard.badgeSecondary}
          </span>
        </div>
        <div className="absolute bottom-4 right-4 bg-[#0F172A]/85 backdrop-blur-md px-3 py-1 rounded-lg text-white text-[11px] flex items-center gap-1.5">
          <ConfirmationIcon name="gps" className="w-[16px] h-[16px] text-[#B4C5FF]" />
          {vehicleCard.gpsLabel}
        </div>
      </div>

      <div className="p-6 sm:p-8 flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] uppercase tracking-wider text-[#2563EB] font-bold">
              {vehicleCard.category}
            </span>
            <span className="text-[11px] text-[#64748B] font-mono">{vehicleCard.vin}</span>
          </div>
          <h3 className="text-[26px] font-bold text-[#0F172A] mt-1">{vehicle.title}</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip.text}
              className="px-3 py-1 rounded-full bg-[#F8FAFC] text-[#64748B] text-[12px] flex items-center gap-1.5"
            >
              <ConfirmationIcon name={chip.icon} className="w-[16px] h-[16px]" />
              {chip.text}
            </span>
          ))}
        </div>

        <div className="bg-[#F8FAFC] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white text-[18px] font-bold text-[#2563EB] flex items-center justify-center shadow-sm">
              {vehicle.operator.initials}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[16px] text-[#0F172A] font-bold">{vehicle.operator.name}</span>
                {vehicle.operator.isVerified && (
                  <BadgeCheck className="w-[18px] h-[18px] text-[#2563EB]" />
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                <span className="flex items-center text-[#F97316] font-bold">
                  <Star className="w-[14px] h-[14px] fill-[#F97316] text-[#F97316]" />
                  {vehicle.operator.rating.toFixed(2)}
                </span>
                <span>({operator.ratingNote})</span>
                <span>• {operator.locationLabel}</span>
              </div>
            </div>
          </div>
          <a
            href={operator.phoneHref}
            title={operator.phoneLabel}
            className="p-2.5 rounded-lg bg-white text-[#0F172A] hover:text-[#2563EB] shadow-sm transition-all flex items-center gap-1 text-[12px] shrink-0"
          >
            <Phone className="w-[18px] h-[18px]" />
            <span className="font-bold">{operator.phone}</span>
          </a>
        </div>
      </div>
    </div>
  );
};