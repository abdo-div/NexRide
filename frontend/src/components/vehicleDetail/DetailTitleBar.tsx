import React from "react";
import { Star, BadgeCheck, MapPin } from "lucide-react";
import type { VehicleDetail } from "../../types/vehicleDetail";

export const DetailTitleBar: React.FC<{ detail: VehicleDetail }> = ({ detail }) => (
  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {detail.badges.map((b) =>
          b.kind === "instant" ? (
            <span
              key={b.text}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[#F97316] text-[11px] font-bold uppercase tracking-wider"
            >
              <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse" />
              {b.text}
            </span>
          ) : (
            <span
              key={b.text}
              className="px-2.5 py-1 rounded-full bg-white border border-[#E2E8F0] text-[#64748B] text-[11px] font-semibold uppercase"
            >
              {b.text}
            </span>
          ),
        )}
      </div>

      <h1 className="text-[32px] lg:text-[42px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
        {detail.vehicle.title}
      </h1>

      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-2 text-[13px] text-[#64748B]">
        <div className="flex items-center gap-1 text-[#F97316]">
          <Star className="w-[18px] h-[18px] fill-[#F97316] text-[#F97316]" />
          <span className="font-bold text-[#0F172A]">{detail.ratingScore}</span>
          <span className="text-[#64748B]">({detail.ratingCount})</span>
        </div>
        <span className="text-[#CBD5E1]">•</span>
        <div className="flex items-center gap-1.5">
          <BadgeCheck className="w-[18px] h-[18px] text-[#2563EB]" />
          <span className="text-[#0F172A] font-semibold">
            {detail.vehicle.operator.name}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#2563EB] text-[10px] font-bold">
            {detail.operatorTier}
          </span>
        </div>
        <span className="text-[#CBD5E1]">•</span>
        <div className="flex items-center gap-1 text-[#64748B]">
          <MapPin className="w-[18px] h-[18px]" />
          {detail.locationLine}
        </div>
      </div>
    </div>

    <div className="flex items-center gap-3 bg-white border border-[#E2E8F0] px-4 py-3 rounded-2xl shadow-sm shrink-0">
      <div
        className={`w-2.5 h-2.5 rounded-full ${
          detail.liveStatus.color === "amber"
            ? "bg-[#F97316] animate-ping"
            : "bg-emerald-500 animate-ping"
        }`}
      />
      <div>
        <p className="text-[11px] uppercase tracking-wider text-[#F97316] font-bold">
          {detail.liveStatus.label}
        </p>
        <p className="text-[13px] font-bold text-[#0F172A]">{detail.liveStatus.caption}</p>
      </div>
    </div>
  </div>
);