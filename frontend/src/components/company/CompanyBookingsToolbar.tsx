import React from "react";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  ChevronDown,
  Search,
  Table2,
  LayoutGrid,
  X,
} from "lucide-react";
import type {
  CompanyBookingsStatus,
  CompanyBookingsView,
  CompanyPaymentState,
} from "../../types/companyBookings";

interface CompanyBookingsToolbarProps {
  view: CompanyBookingsView;
  onViewChange: (view: CompanyBookingsView) => void;
  tabCounts: { all: number; upcoming: number; handover: number };
  search: string;
  onSearchChange: (value: string) => void;
  status: CompanyBookingsStatus | "ALL";
  onStatusChange: (value: CompanyBookingsStatus | "ALL") => void;
  payment: CompanyPaymentState | "ALL";
  onPaymentChange: (value: CompanyPaymentState | "ALL") => void;
  vehicles: { id: string; label: string }[];
  vehicleId: string;
  onVehicleChange: (value: string) => void;
  fromDate: string;
  onFromDateChange: (value: string) => void;
  onReset: () => void;
}

const GROUP_OPTIONS: {
  value: CompanyBookingsStatus | "ALL";
  key: string;
}[] = [
  { value: "ALL", key: "all" },
  { value: "PENDING", key: "PENDING" },
  { value: "CONFIRMED", key: "CONFIRMED" },
  { value: "ACTIVE", key: "ACTIVE" },
  { value: "COMPLETED", key: "COMPLETED" },
  { value: "CANCELLED", key: "CANCELLED" },
];

const PAYMENT_OPTIONS: {
  value: CompanyPaymentState | "ALL";
  key: string;
}[] = [
  { value: "ALL", key: "all" },
  { value: "PAID", key: "PAID" },
  { value: "PENDING", key: "PENDING" },
  { value: "FAILED", key: "FAILED" },
  { value: "REFUNDED", key: "REFUNDED" },
];

const TABS: { value: CompanyBookingsView; key: string; countKey: string }[] = [
  { value: "ALL", key: "all", countKey: "all" },
  { value: "UPCOMING", key: "upcoming", countKey: "upcoming" },
  { value: "HANDOVER", key: "handover", countKey: "handover" },
];

/**
 * The dispatch-desk toolbar: view tabs with live counts, quick search,
 * status / payment / fleet / date filters, clear-all, and the View-As toggle
 * (Table is the real view; Grid is parked as coming soon in the design).
 */
export const CompanyBookingsToolbar: React.FC<CompanyBookingsToolbarProps> = ({
  view,
  onViewChange,
  tabCounts,
  search,
  onSearchChange,
  status,
  onStatusChange,
  payment,
  onPaymentChange,
  vehicles,
  vehicleId,
  onVehicleChange,
  fromDate,
  onFromDateChange,
  onReset,
}) => {
  const { t } = useTranslation();

  const hasActiveFilter =
    search.trim() !== "" ||
    status !== "ALL" ||
    payment !== "ALL" ||
    vehicleId !== "" ||
    fromDate !== "";

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto rounded-xl bg-white p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onViewChange(tab.value)}
            className={`relative flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              view === tab.value
                ? "bg-[#E5EEFF] text-[#2563EB]"
                : "text-[#565E74] hover:bg-[#F1F5F9] hover:text-[#0B1C30]"
            }`}
          >
            {t(`company.bookingsPage.toolbar.${tab.key}`)}
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                view === tab.value
                  ? "bg-[#2563EB] text-white"
                  : "bg-[#EFF4FF] text-[#565E74]"
              }`}
            >
              {tabCounts[tab.countKey as keyof typeof tabCounts]}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-4 xl:grid-cols-6">
        {/* Search */}
        <label className="relative col-span-2 block md:col-span-1 xl:col-span-2">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA4B5]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("company.bookingsPage.toolbar.searchPlaceholder")}
            className="w-full rounded-lg border border-[#E5EEFF] bg-[#F8FAFF] py-2.5 pl-9 pr-3 text-sm font-medium text-[#0B1C30] outline-none transition-colors placeholder:text-[#9AA4B5] focus:border-[#2563EB] focus:ring-2 focus:ring-[#E5EEFF]"
          />
        </label>

        {/* Status */}
        <label className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-wider text-[#9AA4B5]">
            {t("company.bookingsPage.toolbar.status")}
          </span>
          <select
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as CompanyBookingsStatus | "ALL")
            }
            className="w-full cursor-pointer appearance-none rounded-lg border border-[#E5EEFF] bg-[#F8FAFF] px-3 py-2.5 pl-16 pr-8 text-sm font-medium text-[#0B1C30] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#E5EEFF]"
          >
            {GROUP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(`company.bookingsPage.status.${option.key}`)}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA4B5]"
            aria-hidden="true"
          />
        </label>

        {/* Payment */}
        <label className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-wider text-[#9AA4B5]">
            {t("company.bookingsPage.toolbar.payment")}
          </span>
          <select
            value={payment}
            onChange={(event) =>
              onPaymentChange(event.target.value as CompanyPaymentState | "ALL")
            }
            className="w-full cursor-pointer appearance-none rounded-lg border border-[#E5EEFF] bg-[#F8FAFF] px-3 py-2.5 pl-16 pr-8 text-sm font-medium text-[#0B1C30] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#E5EEFF]"
          >
            {PAYMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(`company.bookingsPage.payment.${option.key}`)}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA4B5]"
            aria-hidden="true"
          />
        </label>

        {/* Fleet */}
        <label className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-wider text-[#9AA4B5]">
            {t("company.bookingsPage.toolbar.fleet")}
          </span>
          <select
            value={vehicleId}
            onChange={(event) => onVehicleChange(event.target.value)}
            className="w-full cursor-pointer appearance-none rounded-lg border border-[#E5EEFF] bg-[#F8FAFF] px-3 py-2.5 pl-10 pr-8 text-sm font-medium text-[#0B1C30] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">{t("company.bookingsPage.toolbar.allFleets")}</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA4B5]"
            aria-hidden="true"
          />
        </label>

        {/* Date */}
        <label className="relative flex items-center gap-2 rounded-lg border border-[#E5EEFF] bg-[#F8FAFF] px-3 py-2.5">
          <Calendar className="h-4 w-4 text-[#9AA4B5]" aria-hidden="true" />
          <input
            type="date"
            value={fromDate}
            onChange={(event) => onFromDateChange(event.target.value)}
            className="w-full bg-transparent text-sm font-medium text-[#0B1C30] outline-none [color-scheme:light]"
          />
        </label>

        {/* View-as toggle + clear */}
        <div className="flex items-end justify-end gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-[#F1F5F9] p-1">
            <button
              type="button"
              title={t("company.bookingsPage.toolbar.viewTable")}
              aria-label={t("company.bookingsPage.toolbar.viewTable")}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-[#2563EB] shadow-sm"
            >
              <Table2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled
              title={t("company.bookingsPage.toolbar.viewGridSoon")}
              aria-label={t("company.bookingsPage.toolbar.viewGridSoon")}
              className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md text-[#9AA4B5]"
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-[#BA1A1A] transition-colors hover:bg-[#FFDBE0] cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              {t("company.bookingsPage.toolbar.clear")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyBookingsToolbar;