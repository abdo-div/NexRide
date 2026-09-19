import React from "react";
import { BadgeCheck } from "lucide-react";
import type { VehicleDetail } from "../../types/vehicleDetail";

export const VehicleDescription: React.FC<{ detail: VehicleDetail }> = ({ detail }) => (
  <section className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col gap-4">
    <h2 className="text-[20px] font-bold text-[#0F172A]">{detail.descriptionHeading}</h2>
    <div className="space-y-4 text-[15px] text-[#64748B] leading-relaxed">
      {detail.descriptionParagraphs.map((p) => (
        <p key={p.slice(0, 24)}>{p}</p>
      ))}
    </div>
    <div className="flex flex-wrap gap-2 pt-2">
      {detail.features.map((f) => (
        <span
          key={f}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-[13px] font-semibold"
        >
          <BadgeCheck className="w-[18px] h-[18px] text-[#2563EB]" />
          {f}
        </span>
      ))}
    </div>
  </section>
);