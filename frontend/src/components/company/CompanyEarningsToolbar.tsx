import React from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  CreditCard,
  Filter,
  RotateCcw,
  Search,
  Wallet,
} from "lucide-react";
import type {
  CompanyEarningsVehicle,
  EarningsMethodFilter,
  EarningsStatusFilter,
} from "../../types/companyEarnings";

const STATUS_OPTIONS: { value: EarningsStatusFilter; labelKey: string }[] = [
  { value: "all", labelKey: "company.payoutsPage.register.allStatuses" },
  { value: "completed", labelKey: "company.payoutsPage.register.statusCompleted" },
  { value: "paid", labelKey: "company.payoutsPage.register.statusPaid" },
  { value: "escrow", labelKey: "company.payoutsPage.register.statusEscrow" },
  { value: "refunded", labelKey: "company.payoutsPage.register.statusRefunded" },
];

const METHOD_OPTIONS: { value: EarningsMethodFilter; labelKey: string }[] = [
  { value: "all", labelKey: "company.payoutsPage.register.allMethods" },
  { value: "cash", labelKey: "company.payoutsPage.register.methodCash" },
  { value: "card", labelKey: "company.payoutsPage.register.methodCard" },
  { value: "moamalat", labelKey: "company.payoutsPage.register.methodMoamalat" },
  { value: "wallet", labelKey: "company.payoutsPage.register.methodWallet" },
];

interface CompanyEarningsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: EarningsStatusFilter;
  onStatusChange: (status: EarningsStatusFilter) => void;
  vehicleId: string;
  onVehicleIdChange: (vehicleId: string) => void;
  vehicles: CompanyEarningsVehicle[];
  method: EarningsMethodFilter;
  onMethodChange: (method: EarningsMethodFilter) => void;
  count: number;
  loading: boolean;
  hasActiveFilters: boolean;
  onClear: () => void;
}

const baseSelect =
  "w-full cursor-pointer appearance-none rounded-lg border border-[#E5EEFF] bg-[#F8FAFF] py-2.5 pe-8 ps-9 text-sm font-medium text-[#0B1C30] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#E5EEFF]";

/**
 * Register toolbar for the payout ledger: free-text search (debounced in the
 * hook), a status chip row, vehicle + payment-channel selects, a live result
 * count, and a one-tap clear once any filter is active. Only the register page
 * is filtered — the analytical deck above always reflects the tenant's full
 * ledger within the selected range.
 */
export const CompanyEarningsToolbar: React.FC<CompanyEarningsToolbarProps> = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  vehicleId,
  onVehicleIdChange,
  vehicles,
  method,
  onMethodChange,
  count,
  loading,
  hasActiveFilters,
  onClear,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl bg-white p-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        {/* Search */}
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA4B5]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("company.payoutsPage.register.searchPlaceholder")}
            aria-label={t("company.payoutsPage.register.searchPlaceholder")}
            className="w-full rounded-lg border border-[#E5EEFF] bg-[#F8FAFF] py-2.5 ps-10 pe-4 text-sm font-medium text-[#0B1C30] outline-none transition-colors placeholder:text-[#9AA4B5] focus:border-[#2563EB] focus:ring-2 focus:ring-[#E5EEFF]"
          />
        </div>

        {/* Vehicle */}
        <label className="relative min-w-52">
          <span className="sr-only">{t("company.payoutsPage.register.filterVehicle")}</span>
          <select
            value={vehicleId}
            onChange={(event) => onVehicleIdChange(event.target.value)}
            disabled={vehicles.length === 0}
            className={`${baseSelect} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <option value="">{t("company.payoutsPage.register.allVehicles")}</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.make} {vehicle.model}
                {vehicle.year ? ` (${vehicle.year})` : ""}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA4B5]"
            aria-hidden="true"
          />
        </label>

        {/* Method */}
        <label className="relative min-w-44">
          <span className="sr-only">{t("company.payoutsPage.register.filterMethod")}</span>
          <select
            value={method}
            onChange={(event) =>
              onMethodChange(event.target.value as EarningsMethodFilter)
            }
            className={baseSelect}
          >
            {METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
          <CreditCard
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA4B5]"
            aria-hidden="true"
          />
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA4B5]"
            aria-hidden="true"
          />
        </label>

        {/* Count chip */}
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EFF4FF] px-3 py-2.5 text-[12px] font-bold text-[#2563EB]">
          <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
          {t("company.payoutsPage.register.count", { count })}
        </span>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFE4E5] px-3 py-2.5 text-[12px] font-bold text-[#BA1A1A] transition-colors hover:bg-[#FFDBE0] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("company.payoutsPage.register.clear")}
          </button>
        )}
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-bold text-[#64748B]">
          {t("company.payoutsPage.register.filterStatus")}
        </span>
        {STATUS_OPTIONS.map((option) => {
          const active = status === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={loading}
              onClick={() => onStatusChange(option.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
                active
                  ? "border-[#0B1C30] bg-[#0B1C30] text-white"
                  : "border-[#E5EEFF] bg-white text-[#565E74] hover:border-[#C7D2FE]"
              }`}
            >
              <Filter className="h-3 w-3" aria-hidden="true" />
              {t(option.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CompanyEarningsToolbar;