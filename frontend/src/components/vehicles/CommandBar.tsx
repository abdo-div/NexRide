import React from "react";
import { MapPin, Calendar, SlidersHorizontal, Search } from "lucide-react";
import { SEGMENTS } from "../../data/vehicleData";

export interface ParamPill {
  label: string;
  value: string;
}

interface CommandBarProps {
  params: ParamPill[];
  segment: string | null;
  onSegmentChange: (id: string | null) => void;
  segmentCounts: Record<string, number>;
}

const PARAM_ICONS = [MapPin, Calendar, SlidersHorizontal];

export const CommandBar: React.FC<CommandBarProps> = ({
  params,
  segment,
  onSegmentChange,
  segmentCounts,
}) => (
  <div className="w-full bg-[#FFFFFF] sticky top-20 z-40 border-b border-[#E2E8F0] shadow-sm">
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
      {/* Search parameters pill strip */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100/90 border border-[#E2E8F0] p-1.5 rounded-2xl shadow-sm">
        {params.map((p, i) => {
          const Icon = PARAM_ICONS[i % PARAM_ICONS.length];
          return (
            <button
              key={p.label}
              type="button"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-sm hover:bg-slate-50 transition-colors text-left"
            >
              <Icon className="text-[#2563EB] w-[18px] h-[18px]" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {p.label}
                </span>
                <span className="text-xs font-bold text-[#0F172A]">{p.value}</span>
              </div>
            </button>
          );
        })}
        <button
          type="button"
          className="p-2.5 px-3.5 rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => onSegmentChange(null)}
          className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 shadow-sm transition-colors ${
            segment === null
              ? "bg-[#2563EB] text-white"
              : "bg-white hover:bg-slate-100 text-slate-700 border border-[#E2E8F0]"
          }`}
        >
          All ({segmentCounts.all})
        </button>
        {SEGMENTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSegmentChange(segment === s.id ? null : s.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 shadow-sm transition-colors ${
              segment === s.id
                ? "bg-[#2563EB] text-white"
                : "bg-white hover:bg-slate-100 text-slate-700 border border-[#E2E8F0]"
            }`}
          >
            {s.label} ({segmentCounts[s.id]})
          </button>
        ))}
      </div>
    </div>
  </div>
);