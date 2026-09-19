import React from "react";
import { ScrollText } from "lucide-react";
import { DetailIcon } from "./iconMap";
import type { Requirement } from "../../types/vehicleDetail";

export const RentalRequirements: React.FC<{
  requirements: Requirement[];
  meta: string;
}> = ({ requirements, meta }) => (
  <section className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[20px] font-bold text-[#0F172A] flex items-center gap-2">
        <ScrollText className="w-5 h-5 text-[#2563EB]" />
        Rental Eligibility &amp; Verification
      </h2>
      <span className="text-[11px] font-bold text-[#2563EB]">{meta}</span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {requirements.map((r) => (
        <div
          key={r.title}
          className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-3 hover:border-blue-200 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[#2563EB]">
            <DetailIcon name={r.icon} className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-[#0F172A]">{r.title}</h4>
            <p className="text-[13px] text-[#64748B] mt-0.5">{r.body}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);