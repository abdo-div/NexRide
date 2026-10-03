import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Mail, MoreHorizontal, Phone, Users } from "lucide-react";
import type { AdminCustomerDto } from "../../types/admin";
import type { BookingDto } from "../../types/booking";
import { formatDate, formatLYD, referenceCodeFrom, vehicleTitle } from "../../lib/bookingView";
import type { AdminPaymentDto } from "../../types/admin";
import {
  activeBookingsOfCustomer,
  bookingsOfCustomer,
  latestBookingOfCustomer,
  spendOfCustomer,
  userPhotoUrl,
} from "../../lib/customerView";
import { partnerTenure } from "../../lib/companyView";
import { initialsFrom } from "../../lib/vehicleMapper";
import { StatusPill } from "./StatusPill";

export interface AdminCustomersTableProps {
  customers: AdminCustomerDto[];
  bookings: BookingDto[];
  payments: AdminPaymentDto[];
  selectedId: string;
  onSelect: (customer: AdminCustomerDto) => void;
  openDossier: (customer: AdminCustomerDto) => void;
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  emptyLabel: string;
}

/** Customer & renter management table (real data only) for the Customers page. */
export const AdminCustomersTable: React.FC<AdminCustomersTableProps> = ({
  customers,
  bookings,
  payments,
  selectedId,
  onSelect,
  openDossier,
  page,
  pageSize = 8,
  onPageChange,
  emptyLabel,
}) => {
  const { t, i18n } = useTranslation();

  const totalPages = Math.max(1, Math.ceil(customers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = useMemo(
    () => customers.slice((safePage - 1) * pageSize, safePage * pageSize),
    [customers, safePage, pageSize],
  );

  if (customers.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0FDF4] text-[#059669]">
          <Users className="h-7 w-7" />
        </div>
        <p className="mt-4 max-w-sm text-sm text-[#64748B]">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#EFF4FF] text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              <th className="rounded-s-2xl px-4 py-3">{t("admin.customers.table.customer")}</th>
              <th className="px-4 py-3">{t("admin.customers.table.contact")}</th>
              <th className="px-4 py-3">{t("admin.customers.table.bookings")}</th>
              <th className="px-4 py-3">{t("admin.customers.table.spend")}</th>
              <th className="px-4 py-3">{t("admin.customers.table.lastBooking")}</th>
              <th className="px-4 py-3">{t("admin.customers.table.status")}</th>
              <th className="px-4 py-3">{t("admin.customers.table.registered")}</th>
              <th className="rounded-e-2xl px-4 py-3 text-right">
                {t("admin.customers.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {slice.map((c) => {
              const customerBookings = bookingsOfCustomer(bookings, c);
              const active = activeBookingsOfCustomer(bookings, c);
              const spend = spendOfCustomer(payments, c);
              const lastBooking = latestBookingOfCustomer(bookings, c);
              const tenure = customerTenure(c);
              const selected = c._id === selectedId;
              const avatar = userPhotoUrl(c.photo);

              return (
                <tr
                  key={c._id}
                  onClick={() => onSelect(c)}
                  className={`cursor-pointer border-b border-slate-100 transition-colors last:border-0 ${
                    selected
                      ? "bg-[#EFF4FF]/80"
                      : c.status === "SUSPENDED" || c.status === "BANNED"
                        ? "bg-red-50/30 hover:bg-red-50/50"
                        : "hover:bg-[#EFF4FF]/40"
                  }`}
                >
                  <td className="py-3.5 pl-4 pr-4">
                    <div className="flex min-w-[190px] items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#E5EEFF] text-sm font-bold text-[#2563EB] shadow-sm">
                        {avatar ? (
                          <img src={avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initialsFrom(c.name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-[#0B1C30]">
                          {c.name}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] font-semibold text-[#2563EB]">
                          #{referenceCodeFrom(c._id)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="min-w-[170px]">
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0B1C30]">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-[#565E74]" />
                        <span className="truncate">{c.email}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#565E74]">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.phoneNumber ?? "—"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="text-sm font-bold text-[#0B1C30]">
                      {customerBookings.length}{" "}
                      <span className="text-xs font-normal text-[#565E74]">
                        {t("admin.customers.table.bookingsValue", {
                          count: customerBookings.length,
                        })}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-semibold ${active.length > 0 ? "text-emerald-700" : "text-[#565E74]"}`}
                    >
                      {customerBookings.length > 0
                        ? t("admin.customers.table.activeBookings", { count: active.length })
                        : t("admin.customers.table.noBooking")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="text-sm font-bold text-[#0B1C30]">
                      {spend > 0 ? formatLYD(spend) : 0}{" "}
                      <span className="text-xs font-semibold text-[#565E74]">LYD</span>
                    </div>
                    <span className={`text-xs ${spend > 0 ? "text-[#565E74]" : "text-slate-400"}`}>
                      {spend > 0
                        ? t("admin.customers.table.channels", {
                            channels: channelsLabel(payments, c),
                          })
                        : t("admin.customers.table.noSpend")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {lastBooking ? (
                      <div className="min-w-[170px]">
                        <div className="truncate text-[13px] font-bold text-[#0B1C30]">
                          {vehicleTitle(lastBooking)}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-[#2563EB]">
                          #{referenceCodeFrom(lastBooking._id)}
                        </div>
                        <div className="text-[11px] text-[#565E74]">
                          {formatDate(lastBooking.startDate, i18n.language)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-[#565E74]">
                        {t("admin.customers.table.noBooking")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <StatusPill status={c.status ?? "ACTIVE"} kind="user" />
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="text-sm font-semibold text-[#0B1C30]">
                      {c.createdAt ? formatDate(c.createdAt, i18n.language) : "—"}
                    </div>
                    <span className="text-xs text-[#565E74]">
                      {tenure
                        ? t(
                            `admin.customers.table.member${tenure.kind === "days" ? "Since" : capitalize(tenure.kind)}`,
                            { count: tenure.value },
                          )
                        : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openDossier(c)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                          selected
                            ? "bg-[#2563EB] text-white shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
                            : "bg-[#EFF4FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                        }`}
                      >
                        {t("admin.customers.table.openDossier")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelect(c)}
                        className="rounded-lg p-1 text-[#565E74] transition-colors hover:bg-[#EFF4FF] hover:text-[#0B1C30] cursor-pointer"
                        aria-label={t("admin.customers.table.actions")}
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-[#565E74] sm:flex-row">
        <div>
          {t("admin.customers.table.showingOf", {
            shown: slice.length,
            total: customers.length,
          })}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => onPageChange(safePage - 1)}
              className="rounded-lg bg-[#EFF4FF] px-3 py-1.5 font-semibold text-[#565E74] transition-colors enabled:hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {t("admin.table.prev")}
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`rounded-lg px-3 py-1.5 font-semibold transition-colors cursor-pointer ${
                  p === safePage
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "bg-[#EFF4FF] text-[#565E74] hover:bg-[#E5EEFF]"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(safePage + 1)}
              className="rounded-lg bg-[#EFF4FF] px-3 py-1.5 font-semibold text-[#565E74] transition-colors enabled:hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {t("admin.table.next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const channelsLabel = (
  payments: AdminPaymentDto[],
  customer: AdminCustomerDto,
): string => {
  const seen = new Set<string>();
  payments
    .filter((p) => {
      const id =
        typeof p.customerId === "object"
          ? p.customerId?._id ?? ""
          : (p.customerId ?? "");
      return id === customer._id;
    })
    .forEach((p) => {
      if (p.paymentMethod) seen.add(p.paymentMethod);
    });
  return Array.from(seen).join(" / ") || "—";
};

const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

const customerTenure = (
  customer: AdminCustomerDto,
): { kind: "days" | "months" | "years"; value: number } | null =>
  partnerTenure(customer.createdAt);

export default AdminCustomersTable;