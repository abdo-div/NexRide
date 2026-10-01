import React from "react";
import { useTranslation } from "react-i18next";
import { Search, MapPin, ChevronDown, CalendarDays, CarFront } from "lucide-react";

export type BookingsTab = "all" | "upcoming" | "completed" | "cancelled";

export type BookingsSort = "newest" | "soonest" | "price-desc";

interface BookingFiltersProps {
  tab: BookingsTab;
  onTabChange: (tab: BookingsTab) => void;
  search: string;
  onSearchChange: (value: string) => void;
  cities: string[];
  city: string;
  onCityChange: (city: string) => void;
  sort: BookingsSort;
  onSortChange: (sort: BookingsSort) => void;
  counts: Record<Exclude<BookingsTab, "all">, number>;
}

export const BookingFilters: React.FC<BookingFiltersProps> = ({
  tab,
  onTabChange,
  search,
  onSearchChange,
  cities,
  city,
  onCityChange,
  sort,
  onSortChange,
  counts,
}) => {
  const { t } = useTranslation();

  const tabs: { key: BookingsTab; label: string; count?: number }[] = [
    { key: "all", label: t("myBookings.tabAll") },
    { key: "upcoming", label: t("myBookings.tabActive"), count: counts.upcoming },
    { key: "completed", label: t("myBookings.tabCompleted"), count: counts.completed },
    { key: "cancelled", label: t("myBookings.tabCancelled"), count: counts.cancelled },
  ];

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] p-5 flex flex-col gap-4">
      {/* Tabs row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg">
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onTabChange(item.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? "bg-white text-[#2563EB] shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                      active ? "bg-[#DBEAFE] text-[#1D4ED8]" : "bg-[#E2E8F0] text-[#64748B]"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
          <CalendarDays className="w-4 h-4 text-[#2563EB]" />
          <span>{t("myBookings.period")}</span>
        </div>
      </div>

      {/* Search, city and sort controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 relative flex items-center">
          <Search className="absolute start-3 w-4 h-4 text-[#94A3B8]" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("myBookings.searchPlaceholder")}
            className="w-full bg-[#F1F5F9] hover:bg-[#E8EEF5] focus:bg-white text-[#0F172A] rounded-lg ps-10 pe-4 py-2 text-sm outline-none border border-transparent focus:border-[#93C5FD] focus:ring-2 focus:ring-[#BFDBFE] transition-all placeholder:text-[#94A3B8]"
          />
        </div>

        <div className="md:col-span-3 relative">
          <MapPin className="absolute start-3 top-2.5 w-4 h-4 text-[#94A3B8] pointer-events-none" />
          <select
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
            className="w-full appearance-none bg-[#F1F5F9] hover:bg-[#E8EEF5] focus:bg-white text-[#0F172A] rounded-lg ps-9 pe-9 py-2 text-sm outline-none border border-transparent focus:border-[#93C5FD] focus:ring-2 focus:ring-[#BFDBFE] cursor-pointer"
          >
            <option value="">{t("myBookings.cityAll")}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute end-2.5 top-2.5 w-4 h-4 text-[#64748B] pointer-events-none" />
        </div>

        <div className="md:col-span-2 relative">
          <CarFront className="absolute start-3 top-2.5 w-4 h-4 text-[#94A3B8] pointer-events-none" />
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as BookingsSort)}
            className="w-full appearance-none bg-[#F1F5F9] hover:bg-[#E8EEF5] focus:bg-white text-[#0F172A] rounded-lg ps-9 pe-9 py-2 text-sm outline-none border border-transparent focus:border-[#93C5FD] focus:ring-2 focus:ring-[#BFDBFE] cursor-pointer"
          >
            <option value="newest">{t("myBookings.sortNewest")}</option>
            <option value="soonest">{t("myBookings.sortSoonest")}</option>
            <option value="price-desc">{t("myBookings.sortPriceDesc")}</option>
          </select>
          <ChevronDown className="absolute end-2.5 top-2.5 w-4 h-4 text-[#64748B] pointer-events-none" />
        </div>
      </div>
    </section>
  );
};

export default BookingFilters;