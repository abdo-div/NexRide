import React from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Calendar, SlidersHorizontal, Search, BookmarkPlus } from "lucide-react";
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
  onSaveSearch: () => void;
}

const PARAM_ICONS = [MapPin, Calendar, SlidersHorizontal];

export const CommandBar: React.FC<CommandBarProps> = ({
  params,
  segment,
  onSegmentChange,
  segmentCounts,
  onOpenFilters,
  onSaveSearch,
}) => {
  const { t } = useTranslation();

  return (
    <div className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/90 shadow-[0_12px_35px_-25px_rgba(15,23,42,.45)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col items-stretch justify-between gap-4 px-6 py-4 lg:flex-row lg:items-center lg:px-8">
        {/* Search parameters pill strip */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5">
          {params.map((p, i) => {
            const Icon = PARAM_ICONS[i % PARAM_ICONS.length];
            const isClickable = Boolean(p.onClick);
            const Component = isClickable ? "button" : "div";

            return (
              <Component
                key={p.label}
                type={isClickable ? "button" : undefined}
                onClick={p.onClick}
                className={`flex min-w-[9rem] flex-1 items-center gap-2 rounded-xl border px-3.5 py-2 text-left transition-all lg:flex-none ${
                  p.active
                    ? "bg-[#142B4A] text-white border-[#142B4A]"
                    : isClickable
                      ? "cursor-pointer border-white bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                      : "border-white bg-white shadow-sm"
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
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#142B4A] px-4 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button type="button" onClick={onSaveSearch} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"><BookmarkPlus className="h-4 w-4" />{t("savedSearches.saveCurrent")}</button>
          <span className="me-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{t("fleet.commandBar.browseBy")}</span>
          <button
            type="button"
            onClick={() => onSegmentChange(null)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              segment === null
                ? "bg-[#142B4A] text-white shadow-md"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {t("fleet.commandBar.all", { count: segmentCounts.all })}
          </button>
          {SEGMENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSegmentChange(segment === s.id ? null : s.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                segment === s.id
                  ? "bg-[#142B4A] text-white shadow-md"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
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
