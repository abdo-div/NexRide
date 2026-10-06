import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import {
  formatLYD,
  formatDate,
  rentalDays,
} from "../../lib/bookingView";
import type {
  CompanyBookingRow,
  CompanyPaymentState,
} from "../../types/companyBookings";

interface CompanyBookingsTableProps {
  rows: CompanyBookingRow[];
  lang: string;
  selectedId: string | null;
  onSelect: (row: CompanyBookingRow) => void;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const PAYMENT_STYLES: Record<CompanyPaymentState, string> = {
  PAID: "bg-[#DDF4E4] text-[#0E6B34]",
  PENDING: "bg-[#FFE1CE] text-[#8E3C00]",
  FAILED: "bg-[#FFDBE0] text-[#BA1A1A]",
  REFUNDED: "bg-[#E7E2FD] text-[#4C19C4]",
};

const LIMIT_OPTIONS = [10, 25, 50];

const paymentClass = (payment: CompanyPaymentState) =>
  PAYMENT_STYLES[payment] ?? PAYMENT_STYLES.PENDING;

const vehicleName = (row: CompanyBookingRow): string => {
  const base = [row.vehicle.make, row.vehicle.model].filter(Boolean).join(" ");
  return row.vehicle.year ? `${base} (${row.vehicle.year})` : base || "NexRide Vehicle";
};

/**
 * The dispatch register card: tenant-scoped bookings with reference,
 * customer, vehicle, rental window, amount, payment and status, plus the
 * pagination footer (10/25/50 per page). Clicking a row opens Quick Inspect.
 */
export const CompanyBookingsTable: React.FC<CompanyBookingsTableProps> = ({
  rows,
  lang,
  selectedId,
  onSelect,
  total,
  page,
  limit,
  totalPages,
  canGoPrevious,
  canGoNext,
  onPageChange,
  onLimitChange,
}) => {
  const { t } = useTranslation();
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-start">
          <thead>
            <tr className="bg-[#E5EEFF] text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              <th className="rounded-s-xl px-4 py-3 text-start">
                {t("company.bookingsPage.table.booking")}
              </th>
              <th className="px-4 py-3 text-start">
                {t("company.bookingsPage.table.customer")}
              </th>
              <th className="px-4 py-3 text-start">
                {t("company.bookingsPage.table.vehicle")}
              </th>
              <th className="px-4 py-3 text-start">
                {t("company.bookingsPage.table.period")}
              </th>
              <th className="px-4 py-3 text-start">
                {t("company.bookingsPage.table.amount")}
              </th>
              <th className="px-4 py-3 text-start">
                {t("company.bookingsPage.table.paymentCol")}
              </th>
              <th className="px-4 py-3 text-start">
                {t("company.bookingsPage.table.statusCol")}
              </th>
              <th className="rounded-e-xl px-4 py-3 text-end">
                {t("company.bookingsPage.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EEFF]">
            {rows.map((row) => {
              const selected = selectedId === row.id;
              return (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row)}
                  className={`transition-colors cursor-pointer ${
                    selected ? "bg-[#EFF4FF]" : "hover:bg-[#F1F5F9]"
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-bold text-[#2563EB]">
                        {row.reference}
                      </span>
                      {row.verified && (
                        <span className="rounded bg-[#DDF4E4] px-1.5 py-0.5 text-[10px] font-bold text-[#0E6B34]">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 block text-[11px] capitalize text-[#565E74]">
                      {t(`company.bookingsPage.channel.${row.channel}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DCE9FF] text-xs font-bold text-[#2563EB]">
                        {row.customer.initials}
                      </span>
                      <span className="max-w-[160px] truncate text-sm font-semibold text-[#0B1C30]">
                        {row.customer.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      {row.vehicle.photo ? (
                        <img
                          src={row.vehicle.photo}
                          alt={vehicleName(row)}
                          className="h-9 w-12 shrink-0 rounded-md object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-[#E5EEFF] text-[10px] font-bold text-[#2563EB]">
                          NX
                        </span>
                      )}
                      <span className="max-w-[160px] truncate text-sm font-semibold text-[#0B1C30]">
                        {vehicleName(row)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-[#0B1C30]">
                        {formatDate(row.startDate, lang)} →{" "}
                        {formatDate(row.endDate, lang)}
                      </span>
                      <span className="text-[11px] text-[#565E74]">
                        {rentalDays(row.startDate, row.endDate)}{" "}
                        {t("company.bookingsPage.table.days")}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col">
                      <span className="font-mono text-[13px] font-extrabold text-[#0B1C30]">
                        {formatLYD(row.totalAmount)} LYD
                      </span>
                      <span className="text-[11px] text-[#565E74]">
                        {t("company.bookingsPage.table.netShare", {
                          value: formatLYD(row.companyShare),
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${paymentClass(
                        row.payment,
                      )}`}
                    >
                      {t(`company.bookingsPage.payment.${row.payment}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        row.bookingStatus === "ACTIVE"
                          ? "bg-[#E5EEFF] text-[#0B1C30]"
                          : "bg-[#EFF4FF] text-[#2563EB]"
                      }`}
                    >
                      {row.bookingStatus === "ACTIVE" && (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2563EB]" />
                      )}
                      {t(`company.bookingsPage.status.${row.bookingStatus}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-end">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(row);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#EFF4FF] px-2.5 py-1.5 text-[12px] font-bold text-[#2563EB] transition-colors hover:bg-[#E5EEFF] cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("company.bookingsPage.table.view")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex flex-col justify-between gap-3 border-t border-[#F1F5F9] px-4 py-3.5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-[13px] text-[#565E74]">
          <span>
            {t("company.bookingsPage.table.showingOf", { from, to, total })}
          </span>
          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="cursor-pointer rounded-md border border-[#E5EEFF] bg-white px-2 py-1 text-[12px] font-semibold text-[#0B1C30] outline-none focus:border-[#2563EB]"
          >
            {LIMIT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} / page
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!canGoPrevious}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#565E74] transition-colors hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            aria-label={t("company.bookingsPage.table.prev")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          {Array.from({ length: Math.max(totalPages, 1) }, (_, index) => index + 1)
            .filter(
              (p) =>
                p === 1 ||
                p === totalPages ||
                Math.abs(p - page) <= 1,
            )
            .reduce<number[]>((acc, p) => {
              const last = acc[acc.length - 1];
              if (last !== undefined && p - last > 1) acc.push(NaN);
              acc.push(p);
              return acc;
            }, [])
            .map((p, index) =>
              Number.isNaN(p) ? (
                <span key={`ellipsis-${index}`} className="px-1 text-[13px] text-[#9AA4B5]">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`h-8 min-w-8 rounded-lg px-2 text-[13px] font-bold transition-colors cursor-pointer ${
                    p === page
                      ? "bg-[#2563EB] text-white"
                      : "bg-[#EFF4FF] text-[#565E74] hover:bg-[#E5EEFF]"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#565E74] transition-colors hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            aria-label={t("company.bookingsPage.table.next")}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyBookingsTable;