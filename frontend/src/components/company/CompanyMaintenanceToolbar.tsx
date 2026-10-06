import React from "react";
import { useTranslation } from "react-i18next";
import { ListFilter, RotateCcw, Search, Sparkles, Wrench } from "lucide-react";
import { categoryOptions } from "../../lib/maintenanceView";
import type { MaintenanceDispatchStatus } from "../../types/admin";

const STATUS_OPTIONS: MaintenanceDispatchStatus[] = [
  "SCHEDULED",
  "IN_PROGRESS",
  "OVERDUE",
  "COMPLETED",
];

interface CompanyMaintenanceToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: MaintenanceDispatchStatus | "ALL";
  onStatusChange: (value: MaintenanceDispatchStatus | "ALL") => void;
  category: string;
  onCategoryChange: (value: string) => void;
  simulateEmpty: boolean;
  onSimulateEmptyChange: (value: boolean) => void;
  onReset: () => void;
}

/**
 * Live filters for the records ledger — free-text search, dispatch status and
 * maintenance category are all real server-side filters. The inspection
 * dropdown stays disabled (no inspection result model yet) and "simulate empty"
 * mirrors the sheet's preview toggle for the empty state.
 */
export const CompanyMaintenanceToolbar: React.FC<CompanyMaintenanceToolbarProps> = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  simulateEmpty,
  onSimulateEmptyChange,
  onReset,
}) => {
  const { t } = useTranslation();

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <div className="relative min-w-[280px]">
        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-[#565E74]">
          <Search className="h-[18px] w-[18px]" />
        </div>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("company.maintenance.filters.searchPlaceholder")}
          className="w-full rounded-xl bg-[#EFF4FF] py-2.5 ps-11 pe-4 text-sm text-[#0B1C30] outline-none transition-all placeholder:text-[#565E74] focus:bg-white focus:ring-2 focus:ring-[#2563EB]"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <FilterSelect
          label={t("company.maintenance.filters.status")}
          icon={<ListFilter className="h-4 w-4" />}
          value={status}
          onChange={(v) => onStatusChange(v as MaintenanceDispatchStatus | "ALL")}
          options={STATUS_OPTIONS.map((s) => ({
            value: s,
            label: t(`admin.maintenance.statuses.${s}`),
          }))}
          allLabel={t("company.maintenance.filters.statusAll")}
        />
        <FilterSelect
          label={t("company.maintenance.filters.category")}
          icon={<Wrench className="h-4 w-4" />}
          value={category}
          onChange={onCategoryChange}
          options={categoryOptions.map((c) => ({
            value: c,
            label: t(`admin.maintenance.categories.${c}`),
          }))}
          allLabel={t("company.maintenance.filters.categoryAll")}
        />
        <FilterSelect
          label={t("company.maintenance.filters.inspection")}
          icon={<Sparkles className="h-4 w-4" />}
          value=""
          onChange={() => undefined}
          options={[]}
          allLabel=""
          disabled
          soonLabel={t("company.maintenance.soon")}
        />
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => onSimulateEmptyChange(!simulateEmpty)}
            title={t("company.maintenance.filters.simulateEmptyHint")}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all cursor-pointer xl:h-[42px] ${
              simulateEmpty
                ? "border-[#2563EB] bg-[#EFF4FF] text-[#2563EB]"
                : "border-[#E5E7EB] bg-white text-[#565E74] hover:bg-[#F8FAFF]"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full transition-colors ${
                simulateEmpty ? "bg-[#2563EB]" : "bg-[#CBD5E1]"
              }`}
              aria-hidden="true"
            />
            {t("company.maintenance.filters.simulateEmpty")}
          </button>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#EFF4FF] px-3 py-2 text-sm font-semibold text-[#2563EB] transition-all hover:bg-[#E5EEFF] cursor-pointer xl:h-[42px]"
          >
            <RotateCcw className="h-4 w-4" />
            {t("company.maintenance.filters.reset")}
          </button>
        </div>
      </div>
    </section>
  );
};

interface FilterSelectProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
  disabled?: boolean;
  soonLabel?: string;
}

const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  icon,
  value,
  onChange,
  options,
  allLabel,
  disabled,
  soonLabel,
}) => (
  <div>
    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
      {label}
    </label>
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-[#565E74]">
        {icon}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full cursor-pointer appearance-none rounded-xl bg-[#EFF4FF] py-2.5 ps-10 pe-8 text-sm font-semibold text-[#0B1C30] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:text-[#9AA4B5] ${
          disabled ? "opacity-70" : ""
        }`}
      >
        {allLabel !== "" && <option value="">{disabled ? `${label} · ${soonLabel ?? ""}` : allLabel}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-[#565E74]">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </div>
  </div>
);

export default CompanyMaintenanceToolbar;