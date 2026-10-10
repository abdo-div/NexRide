import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, LayoutGrid, List, ScanLine, Search, X } from "lucide-react";
import type {
  CompanyFleetCategory,
  CompanyFleetDisplayState,
  CompanyFleetFuel,
  CompanyFleetTransmission,
  CompanyFleetView,
} from "../../types/companyFleet";

interface CompanyFleetToolbarProps {
  view: CompanyFleetView;
  onViewChange: (view: CompanyFleetView) => void;
  quickInspectOn: boolean;
  onQuickInspect: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  status: CompanyFleetDisplayState | "all";
  onStatusChange: (value: CompanyFleetDisplayState | "all") => void;
  category: CompanyFleetCategory;
  onCategoryChange: (value: CompanyFleetCategory) => void;
  transmission: CompanyFleetTransmission;
  onTransmissionChange: (value: CompanyFleetTransmission) => void;
  fuel: CompanyFleetFuel;
  onFuelChange: (value: CompanyFleetFuel) => void;
  city: string;
  onCityChange: (value: string) => void;
  onReset: () => void;
  availableCities: string[];
}

const selectClass =
  "appearance-none rounded-xl border border-[#E5E7EB] bg-white py-2 pl-3 pr-8 text-sm font-medium text-[#565E74] shadow-sm outline-none transition-colors hover:border-[#C9D2E0] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer";

const Select = <T extends string>({
  value,
  onChange,
  children,
}: {
  value: T;
  onChange: (value: T) => void;
  children: React.ReactNode;
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={selectClass}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA4B5]"
      aria-hidden="true"
    />
  </div>
);

/** Search, List/Grid switch, the Quick Inspect slide-over toggle and the filter pill row. */
export const CompanyFleetToolbar: React.FC<CompanyFleetToolbarProps> = ({
  view,
  onViewChange,
  quickInspectOn,
  onQuickInspect,
  search,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  transmission,
  onTransmissionChange,
  fuel,
  onFuelChange,
  city,
  onCityChange,
  onReset,
  availableCities,
}) => {
  const { t } = useTranslation();
  const filtersActive =
    search.trim() !== "" ||
    status !== "all" ||
    category !== "all" ||
    transmission !== "all" ||
    fuel !== "all" ||
    city.trim() !== "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA4B5]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("company.fleetPage.searchPlaceholder")}
            className="w-full rounded-xl border border-[#E5E7EB] bg-white py-2 pl-9 pr-3 text-sm text-[#0B1C30] shadow-sm outline-none transition-colors placeholder:text-[#9AA4B5] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-[#E5E7EB] bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => onViewChange("list")}
              className={`flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                view === "list"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-[#565E74] hover:bg-[#F7F9FC]"
              }`}
            >
              <List className="h-4 w-4" aria-hidden="true" />
              {t("company.fleetPage.views.list")}
            </button>
            <button
              type="button"
              onClick={() => onViewChange("grid")}
              className={`flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                view === "grid"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-[#565E74] hover:bg-[#F7F9FC]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              {t("company.fleetPage.views.grid")}
            </button>
          </div>

          <button
            type="button"
            onClick={onQuickInspect}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold shadow-sm transition-colors cursor-pointer ${
              quickInspectOn
                ? "border-[#2563EB] bg-[#EFF4FF] text-[#2563EB]"
                : "border-[#E5E7EB] bg-white text-[#565E74] hover:border-[#C9D2E0]"
            }`}
          >
            <ScanLine className="h-4 w-4" aria-hidden="true" />
            {t("company.fleetPage.quickInspect")}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onChange={onStatusChange}>
          <option value="all">{t("company.fleetPage.filters.statusAll")}</option>
          <option value="available">{t("company.fleetPage.filters.available")}</option>
          <option value="rented">{t("company.fleetPage.filters.rented")}</option>
          <option value="maintenance">
            {t("company.fleetPage.filters.maintenance")}
          </option>
          <option value="draft">{t("company.fleetPage.filters.draft")}</option>
        </Select>

        <Select value={category} onChange={onCategoryChange}>
          <option value="all">{t("company.fleetPage.filters.categoryAll")}</option>
          <option value="sedan">{t("company.fleetPage.filters.sedan")}</option>
          <option value="suv">{t("company.fleetPage.filters.suv")}</option>
          <option value="luxury">{t("company.fleetPage.filters.luxury")}</option>
          <option value="commercial">{t("company.fleetPage.filters.commercial")}</option>
        </Select>

        <Select value={transmission} onChange={onTransmissionChange}>
          <option value="all">
            {t("company.fleetPage.filters.transmissionAll")}
          </option>
          <option value="automatic">
            {t("company.fleetPage.filters.automatic")}
          </option>
          <option value="manual">{t("company.fleetPage.filters.manual")}</option>
        </Select>

        <Select value={fuel} onChange={onFuelChange}>
          <option value="all">{t("company.fleetPage.filters.fuelAll")}</option>
          <option value="petrol">{t("company.fleetPage.filters.petrol")}</option>
          <option value="hybrid">{t("company.fleetPage.filters.hybrid")}</option>
          <option value="diesel">{t("company.fleetPage.filters.diesel")}</option>
          <option value="electric">{t("company.fleetPage.filters.electric")}</option>
        </Select>

        <Select value={city} onChange={onCityChange}>
          <option value="">{t("company.fleetPage.filters.cityAll")}</option>
          {availableCities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        {(filtersActive || city.trim() !== "") && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-[#B54E00] transition-colors hover:bg-[#F0E1D7] cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {t("company.fleetPage.filters.clear")}
          </button>
        )}
      </div>
    </div>
  );
};

export default CompanyFleetToolbar;