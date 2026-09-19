import React from "react";
import { Car, BadgeCheck, Star, MessageCircle, Phone } from "lucide-react";
import type { VehicleDetail } from "../../types/vehicleDetail";

export const OperatorProfile: React.FC<{ detail: VehicleDetail }> = ({ detail }) => {
  const op = detail.vehicle.operator;
  return (
    <section className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 shadow-sm text-[#2563EB]">
          <Car className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[18px] font-bold text-[#0F172A]">{op.name}</h3>
            <BadgeCheck className="w-5 h-5 text-[#2563EB]" />
          </div>
          <p className="text-[13px] text-[#64748B]">{detail.operator.meta}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[12px] text-[#64748B]">
            <span className="flex items-center gap-1 text-[#F97316] font-bold">
              <Star className="w-4 h-4 fill-[#F97316] text-[#F97316]" /> {op.rating.toFixed(2)} Rating
            </span>
            <span>•</span>
            <span>{detail.operator.completedRentals}</span>
            <span>•</span>
            <span className="text-[#2563EB] font-bold">{detail.operator.responseTime}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 w-full md:w-auto">
        <button
          type="button"
          className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#0F172A] text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <MessageCircle className="w-[18px] h-[18px] text-[#2563EB]" />
          Agency WhatsApp
        </button>
        <button
          type="button"
          className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#0F172A] text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Phone className="w-[18px] h-[18px] text-[#2563EB]" />
          Direct Call
        </button>
      </div>
    </section>
  );
};