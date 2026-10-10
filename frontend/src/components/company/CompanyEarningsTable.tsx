import React from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  SearchX,
  Wallet,
} from "lucide-react";
import type { PaginationMeta } from "../../types/admin";
import {
  formatDateTime,
  moneyOf,
  viewStatusOf,
} from "../../lib/companyEarningsView";
import type {
  CompanyEarningsBooking,
  CompanyEarningsRow,
  PaymentMethod,
} from "../../types/companyEarnings";

const LIMIT_OPTIONS = [8, 10, 25, 50];

const METHOD_ICON: Record<PaymentMethod, React.ComponentType<{ className?: string }>> = {
  CASH_ON_DELIVERY: Banknote,
  LOCAL_CARD: BadgeCheck,
  MOAMALAT: BadgeCheck,
  WALLET: Wallet,
};

const METHOD_ID: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: "cash",
  LOCAL_CARD: "card",
  MOAMALAT: "moamalat",
  WALLET: "wallet",
};

const STATUS_STYLES: Record<string, string> = {
  refunded: "bg-[#FFF1F2] text-[#E11D48]",
  partiallyRefunded: "bg-[#FFF1F2] text-[#E11D48]",
  disbursed: "bg-[#EFF4FF] text-[#2563EB]",
  processing: "bg-[#FFF4E5] text-[#B45309]",
  completed: "bg-emerald-50 text-emerald-700",
};

const StatusChip: React.FC<{ row: CompanyEarningsRow }> = ({ row }) => {
  const { t } = useTranslation();
  const variant = viewStatusOf(row.status, row.payoutStatus);
  const label = t(`company.payoutsPage.rows.status.${variant}`);
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[variant]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          variant === "refunded" || variant === "partiallyRefunded"
            ? "bg-[#E11D48]"
            : variant === "disbursed"
              ? "bg-[#2563EB]"
              : variant === "processing"
                ? "bg-[#F59E0B]"
                : "bg-emerald-500"
        }`}
      />
      {label}
    </span>
  );
};

const BookingCell: React.FC<{ booking: CompanyEarningsBooking | null }> = ({
  booking,
}) => {
  const { t } = useTranslation();
  if (!booking) return <span className="text-[#9AA4B5]">—</span>;
  return (
    <div className="min-w-0">
      <span className="block truncate text-[12px] font-bold text-[#0B1C30]">
        {booking.reference}
      </span>
      <span className="block truncate text-[11px] font-semibold text-[#64748B]">
        {booking.totalDays === null || booking.totalDays === undefined
          ? t("company.payoutsPage.rows.rentalUnknown")
          : t("company.payoutsPage.rows.rental", { days: booking.totalDays })}
      </span>
    </div>
  );
};

interface CompanyEarningsTableProps {
  rows: CompanyEarningsRow[];
  lang: string;
  loading: boolean;
  hasActiveFilters: boolean;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onOpenRow: (row: CompanyEarningsRow) => void;
}

/**
 * Recent Transactions — the payout ledger register for the current page. Each
 * row carries the real transaction ref, booking ref, vehicle & depot, captured
 * date, gross, the marketplace fee at its actual commission rate, the net
 * company take, and a derived status chip. "View" opens the per-transaction
 * audit drawer; the footer paginates over the same ledger the filters shaped.
 */
export const CompanyEarningsTable: React.FC<CompanyEarningsTableProps> = ({
  rows,
  lang,
  loading,
  hasActiveFilters,
  pagination,
  onPageChange,
  onLimitChange,
  onOpenRow,
}) => {
  const { t } = useTranslation();

  const { page, totalPages, hasNextPage, hasPreviousPage, total } = pagination;
  const from = total === 0 ? 0 : (page - 1) * pagination.limit + 1;
  const to = Math.min(page * pagination.limit, total);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        {hasActiveFilters ? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF4FF]">
              <SearchX className="h-6 w-6 text-[#2563EB]" aria-hidden="true" />
            </div>
            <p className="text-[16px] font-bold text-[#0B1C30]">
              {t("company.payoutsPage.register.emptyFilter")}
            </p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF4FF]">
              <Wallet className="h-6 w-6 text-[#2563EB]" aria-hidden="true" />
            </div>
            <p className="text-[16px] font-bold text-[#0B1C30]">
              {t("company.payoutsPage.states.emptyTitle")}
            </p>
            <p className="max-w-md text-[13px] leading-relaxed text-[#64748B]">
              {t("company.payoutsPage.states.emptyBody")}
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-[#F1F5F9] bg-[#F8FAFF]">
              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.payoutsPage.table.colRef")}
              </th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.payoutsPage.table.colBooking")}
              </th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.payoutsPage.table.colVehicle")}
              </th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.payoutsPage.table.colDate")}
              </th>
              <th className="px-4 py-3 text-end text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.payoutsPage.table.colGross")}
              </th>
              <th className="px-4 py-3 text-end text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.payoutsPage.table.colFee")}
              </th>
              <th className="px-4 py-3 text-end text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.payoutsPage.table.colNet")}
              </th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.payoutsPage.table.colStatus")}
              </th>
              <th className="px-5 py-3 text-end text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.payoutsPage.table.colAction")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {rows.map((row) => {
              const MethodIcon = METHOD_ICON[row.paymentMethod];
              const methodKey = METHOD_ID[row.paymentMethod];
              const timestamp = row.paidAt ?? row.createdAt;
              const net = row.companyShare;
              return (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-[#F8FAFF]"
                >
                  <td className="px-5 py-3.5">
                    <span className="block text-[12px] font-extrabold tracking-tight text-[#0B1C30]">
                      {row.trxRef}
                    </span>
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748B]">
                      <MethodIcon className="h-3 w-3" aria-hidden="true" />
                      {t(`company.payoutsPage.rows.method.${methodKey}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <BookingCell booking={row.booking} />
                  </td>
                  <td className="px-4 py-3.5">
                    {row.vehicle ? (
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#E5EEFF] text-[#2563EB]">
                          {row.vehicle.photo ? (
                            <img
                              src={row.vehicle.photo}
                              alt={row.vehicle.make}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Car className="h-4 w-4" aria-hidden="true" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-44 truncate text-[12px] font-bold text-[#0B1C30]">
                            {row.vehicle.make} {row.vehicle.model}
                            {row.vehicle.year ? ` (${row.vehicle.year})` : ""}
                          </span>
                          <span className="flex items-center gap-1 truncate text-[11px] font-semibold text-[#64748B]">
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                            {row.booking?.pickupLocation ?? t("company.payoutsPage.rows.noDepot")}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#9AA4B5]">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#434655]">
                      <CalendarDays className="h-3.5 w-3.5 text-[#9AA4B5]" aria-hidden="true" />
                      {timestamp ? formatDateTime(timestamp, lang) : "—"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-end text-[13px] font-bold text-[#0B1C30]">
                    {moneyOf(row.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-end">
                    <span className="text-[13px] font-bold text-[#B45309]">
                      -{moneyOf(row.commissionAmount)}
                    </span>
                    <span className="block text-[10px] font-bold text-[#9AA4B5]">
                      {t("company.payoutsPage.rows.feeRate", {
                        rate: row.commissionRate.toFixed(1),
                      })}
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3.5 text-end text-[13px] font-extrabold ${
                      net < 0 ? "text-[#E11D48]" : "text-[#0B1C30]"
                    }`}
                  >
                    {net < 0 ? `-${moneyOf(Math.abs(net))}` : moneyOf(net)}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusChip row={row} />
                  </td>
                  <td className="px-5 py-3.5 text-end">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onOpenRow(row)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#EFF4FF] px-3 py-1.5 text-[11px] font-bold text-[#2563EB] transition-colors hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("company.payoutsPage.rows.view")}
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
          <span>{t("company.payoutsPage.table.showingOf", { from, to, total })}</span>
          <select
            value={pagination.limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="cursor-pointer rounded-md border border-[#E5EEFF] bg-white px-2 py-1 text-[12px] font-semibold text-[#0B1C30] outline-none focus:border-[#2563EB]"
          >
            {LIMIT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t("company.payoutsPage.table.perPage", { count: option })}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!hasPreviousPage}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#565E74] transition-colors hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            aria-label={t("company.payoutsPage.table.prev")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          {Array.from({ length: Math.max(totalPages, 1) }, (_, index) => index + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
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
            disabled={!hasNextPage}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#565E74] transition-colors hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            aria-label={t("company.payoutsPage.table.next")}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyEarningsTable;