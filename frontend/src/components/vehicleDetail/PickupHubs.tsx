import React from "react";
import { Building2, MapPin } from "lucide-react";
import type { VehicleDetail } from "../../types/vehicleDetail";

const HubIcon: React.FC<{ kind: "plane" | "building"; className?: string }> = ({
  kind,
  className,
}) => {
  const cls = className ?? "w-[18px] h-[18px] text-[#2563EB]";
  return kind === "plane" ? <MapPin className={cls} /> : <Building2 className={cls} />;
};

export const PickupHubs: React.FC<{ detail: VehicleDetail }> = ({ detail }) => (
  <section className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
      <div>
        <h2 className="text-[20px] font-bold text-[#0F172A]">Pickup &amp; Drop-off Hubs</h2>
        <p className="text-[13px] text-[#64748B]">Choose your preferred location during booking checkout</p>
      </div>
      <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-[#2563EB] text-[11px] font-bold border border-blue-100 self-start">
        {detail.hubBadge}
      </span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      {detail.hubs.map((h) => (
        <div key={h.name} className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold text-[#0F172A]">{h.name}</span>
            <HubIcon kind={h.icon} />
          </div>
          <p className="text-[13px] text-[#64748B] mt-1">{h.description}</p>
        </div>
      ))}
    </div>
    <div className="w-full h-56 rounded-2xl border border-[#E2E8F0] relative overflow-hidden flex items-end p-4 shadow-inner bg-gradient-to-br from-blue-600/10 via-slate-100 to-slate-200">
      {detail.mapImage && (
        <img
          src={detail.mapImage}
          alt="Tripoli delivery zone map"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
      )}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" />
      <div className="relative z-10 bg-white/95 border border-[#E2E8F0] p-3.5 rounded-2xl flex items-center justify-between w-full shadow-md">
        <div className="flex items-center gap-3">
          <MapPin className="w-[26px] h-[26px] text-[#2563EB] shrink-0" />
          <div>
            <p className="text-[14px] font-bold text-[#0F172A]">{detail.conciergeTitle}</p>
            <p className="text-[12px] text-[#64748B]">{detail.conciergeBody}</p>
          </div>
        </div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="text-[12px] font-bold text-[#2563EB] hover:underline underline-offset-4 hidden sm:block shrink-0"
        >
          {detail.mapLinkLabel}
        </a>
      </div>
    </div>
  </section>
);