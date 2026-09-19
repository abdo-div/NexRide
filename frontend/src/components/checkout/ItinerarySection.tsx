import React from "react";
import { CalendarDays } from "lucide-react";
import { CheckoutIcon } from "./CheckoutIcon";
import type { CheckoutMeta } from "../../types/checkout";

export const ItinerarySection: React.FC<{ meta: CheckoutMeta }> = ({ meta }) => {
  const { pickup, dropoff, durationLabel, cancelNote, changeLabel } = meta.itinerary;

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold text-[14px]">
            1
          </div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">Rental Itinerary</h2>
        </div>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] text-[#2563EB] hover:bg-[#F1F5F9] text-[12px] font-semibold transition-colors flex items-center gap-1"
        >
          <CalendarDays className="w-[15px] h-[15px]" />
          {changeLabel}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-xl">
        {[pickup, dropoff].map((stop) => (
          <div key={stop.label} className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-[#64748B] font-bold flex items-center gap-1.5">
              <CheckoutIcon name={stop.icon} className="w-[16px] h-[16px] text-[#2563EB]" />
              {stop.label}
            </span>
            <p className="text-[15px] font-bold text-[#0F172A] leading-tight">{stop.location}</p>
            <div className="flex items-center gap-2 text-[#64748B] text-[13px] mt-0.5">
              <CheckoutIcon name="clock" className="w-[16px] h-[16px] text-[#94A3B8]" />
              <span className="font-medium text-[#0F172A]">{stop.date}</span>
              <span className="text-[#CBD5E1]">•</span>
              <span>{stop.time}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8EFFD] text-[#1E3A8A] text-[12px] font-bold">
          <CheckoutIcon name="timer" className="w-[16px] h-[16px]" />
          {durationLabel}
        </div>
        <div className="inline-flex items-center gap-1.5 text-[#64748B] text-[12px]">
          <CheckoutIcon name="verified" className="w-[18px] h-[18px] text-[#2563EB]" />
          {cancelNote}
        </div>
      </div>
    </section>
  );
};