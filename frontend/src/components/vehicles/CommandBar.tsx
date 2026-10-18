import React from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Calendar, SlidersHorizontal, Search } from "lucide-react";
import { SEGMENTS } from "../../data/vehicleData";

export interface ParamPill {
  label: string;
  value: string;
  onClick?: () => void;
  active?: boolean;
}

interface CommandBarProps {
  params: ParamPill[];
  segment: string | null;
  onSegmentChange: (id: string | null) => void;
  segmentCounts: Record<string, number>;
  onOpenFilters: () => void;
}

const PARAM_ICONS = [MapPin, Calendar, SlidersHorizontal];

export const CommandBar: React.FC<CommandBarProps> = ({
  params,
  segment,
  onSegmentChange,
  segmentCounts,
  onOpenFilters,
}) => {
  const { t } = useTranslation();

  return (
    <div className="w-full bg-[#FFFFFF] border-b border-[#E2E8F0] shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search parameters pill strip */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100/90 border border-[#E2E8F0] p-1.5 rounded-2xl shadow-sm">
          {params.map((p, i) => {
            const Icon = PARAM_ICONS[i % PARAM_ICONS.length];
            const isClickable = Boolean(p.onClick);
            const Component = isClickable ? "button" : "div";

            return (
              <Component
                key={p.label}
                type={isClickable ? "button" : undefined}
                onClick={p.onClick}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E2E8F0] shadow-sm transition-colors text-left ${
                  p.active
                    ? "bg-[#142B4A] text-white border-[#142B4A]"
                    : isClickable
                      ? "bg-[#FFFFFF] hover:bg-slate-50 cursor-pointer"
                      : "bg-[#FFFFFF] hover:bg-slate-50"
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] ${
                    p.active ? "text-blue-300" : "text-[#142B4A]"
                  }`}
                />
                <div className="flex flex-col text-start">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      p.active ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {p.label}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      p.active ? "text-white" : "text-[#0F172A]"
                    }`}
                  >
                    {p.value}
                  </span>
                </div>
              </Component>
            );
          })}
          <button
            type="button"
            onClick={onOpenFilters}
            aria-label={t("fleet.filters.title")}
            className="p-2.5 px-3.5 rounded-xl bg-[#142B4A] text-white hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center cursor-pointer"
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
                ? "bg-[#142B4A] text-white"
                : "bg-white hover:bg-slate-100 text-slate-700 border border-[#E2E8F0]"
            }`}
          >
            {t("fleet.commandBar.all", { count: segmentCounts.all })}
          </button>
          {SEGMENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSegmentChange(segment === s.id ? null : s.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 shadow-sm transition-colors ${
                segment === s.id
                  ? "bg-[#142B4A] text-white"
                  : "bg-white hover:bg-slate-100 text-slate-700 border border-[#E2E8F0]"
              }`}
            >
              {t("fleet.commandBar.segment", {
                label: t(s.label),
                count: segmentCounts[s.id],
              })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
