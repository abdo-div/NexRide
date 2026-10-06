import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin, Plane, Search } from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import type { CompanyVehicleTrip } from "../../types/companyVehicle";
import { Pill } from "./CompanyVehicleBits";
import { paymentTone, tripStatusTone } from "./companyVehicleUi";

interface CompanyVehicleTripsHistoryProps {
  trips: CompanyVehicleTrip[];
  total: number;
  page: number;
  totalPages: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
  onViewAll: () => void;
}

const shortRange = (startIso: string, endIso: string, lang: string): string => {
  const start = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" }).format(
    new Date(startIso),
  );
  const end = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(endIso));
  return `${start} → ${end}`;
};

/**
 * Full-width booking history for this vehicle: the ledger's own rows (search &
 * paging trip the whole dossier, so the filter textbox reaches the backend and
 * re-runs the query). Payment and status pills reuse the dispatch register
 * keys already shipped for the bookings page.
 */
export const CompanyVehicleTripsHistory: React.FC<CompanyVehicleTripsHistoryProps> = ({
  trips,
  total,
  page,
  totalPages,
  canGoPrevious,
  canGoNext,
  search,
  onSearchChange,
  onPageChange,
  onViewAll,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const from = total === 0 ? 0 : (page - 1) * 8 + 1;
  const to = Math.min(page * 8, total);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-[17px] font-bold text-[#0B1C30]">
            {t("company.vehiclePage.trips.title")}
          </h2>
          <p className="text-xs text-[#9AA4B5]">
            {t("company.vehiclePage.trips.subtitle", { count: total })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA4B5]"
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("company.vehiclePage.trips.searchPlaceholder")}
              className="h-10 w-64 rounded-xl border border-transparent bg-[#F1F5F9] pl-9 pr-3 text-sm text-[#0B1C30] placeholder:text-[#9AA4B5] focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#E5EEFF] px-4 py-2 text-sm font-semibold text-[#2563EB] transition-colors hover:bg-[#DCE9FF] cursor-pointer"
          >
            {t("company.vehiclePage.trips.viewAll")}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-xl bg-[#F8FAFC] py-12 text-center text-sm text-[#64748B]">
          {t("company.vehiclePage.trips.empty")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F9FC]">
                {[
                  "reference",
                  "customer",
                  "duration",
                  "service",
                  "amount",
                  "payment",
                  "status",
                ].map((key) => (
                  <th
                    key={key}
                    className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#565E74]"
                  >
                    {t(`company.vehiclePage.trips.col.${key}`)}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                  {t("company.vehiclePage.trips.col.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr
                  key={trip.id}
                  className="border-b border-[#F1F5F9] transition-colors last:border-0 hover:bg-[#F7F9FC]"
                >
                  <td className="px-4 py-3.5 font-mono text-xs font-bold text-[#2563EB]">
                    {trip.reference}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-bold text-[#0B1C30]">
                      {trip.customer.name || "—"}
                    </p>
                    {trip.customer.phone && (
                      <p className="font-mono text-[11px] text-[#9AA4B5]">
                        {trip.customer.phone}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-bold text-[#0B1C30]">
                      {shortRange(trip.startDate, trip.endDate, lang)}
                    </p>
                    <p className="text-[11px] text-[#9AA4B5]">
                      {t("company.vehiclePage.trips.days", { count: trip.days })}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B1C30]">
                      {trip.service.delivery ? (
                        <Plane className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                      ) : (
                        <MapPin className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                      )}
                      {trip.service.delivery
                        ? `${t("company.vehiclePage.trips.delivery")} · ${trip.service.label}`
                        : trip.service.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm font-bold text-[#0B1C30]">
                    {formatLYD(trip.totalAmount)} LYD
                  </td>
                  <td className="px-4 py-3.5">
                    <Pill tone={paymentTone(trip.payment)}>
                      {t(`company.bookingsPage.payment.${trip.payment}`)}
                    </Pill>
                  </td>
                  <td className="px-4 py-3.5">
                    <Pill tone={tripStatusTone(trip.bookingStatus)}>
                      {t(`company.bookingsPage.status.${trip.bookingStatus}`)}
                    </Pill>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      disabled
                      title={t("company.vehiclePage.soon")}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t("company.vehiclePage.trips.view")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#F1F5F9] pt-4">
        <p className="text-sm font-medium text-[#565E74]">
          {t("company.vehiclePage.trips.showStyle", { from, to, total })}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={!canGoPrevious}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#565E74] transition-colors hover:bg-[#F7F9FC] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            aria-label={t("company.fleetPage.pagination.previous")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`h-9 min-w-9 rounded-lg px-2 text-sm font-semibold transition-colors cursor-pointer ${
                p === page
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-[#565E74] hover:bg-[#F7F9FC]"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={!canGoNext}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#565E74] transition-colors hover:bg-[#F7F9FC] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            aria-label={t("company.fleetPage.pagination.next")}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default CompanyVehicleTripsHistory;