import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Eye, MoreHorizontal } from "lucide-react";
import type { BookingDto } from "../../types/booking";
import {
  formatLYD,
  referenceCodeFrom,
  vehicleTitle,
} from "../../lib/bookingView";
import { photoUrl } from "../../lib/vehicleMapper";
import { StatusPill } from "./StatusPill";

export interface AdminBookingsTableProps {
  bookings: BookingDto[];
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onView: (booking: BookingDto) => void;
  emptyLabel: string;
}

const customerName = (booking: BookingDto): string =>
  typeof booking.customerId === "object" ? booking.customerId.name ?? "" : "";

const customerSub = (booking: BookingDto): string => {
  if (typeof booking.customerId !== "object") return "";
  return booking.customerId.phoneNumber ?? booking.customerId.email ?? "";
};

const providerName = (booking: BookingDto): string =>
  typeof booking.companyId === "object" ? booking.companyId.name ?? "" : "";

const providerCity = (booking: BookingDto): string =>
  typeof booking.companyId === "object" ? booking.companyId.city ?? "" : "";

/** The shared bookings table used by the Overview and Bookings pages. */
export const AdminBookingsTable: React.FC<AdminBookingsTableProps> = ({
  bookings,
  page,
  pageSize = 8,
  onPageChange,
  onView,
  emptyLabel,
}) => {
  const { t } = useTranslation();

  const totalPages = Math.max(1, Math.ceil(bookings.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = useMemo(
    () => bookings.slice((safePage - 1) * pageSize, safePage * pageSize),
    [bookings, safePage, pageSize],
  );

  if (bookings.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
          <CalendarDays className="h-7 w-7" />
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
              <th className="rounded-s-2xl px-4 py-3">{t("admin.table.bookingVehicle")}</th>
              <th className="px-4 py-3">{t("admin.table.client")}</th>
              <th className="px-4 py-3">{t("admin.table.provider")}</th>
              <th className="px-4 py-3">{t("admin.table.pickup")}</th>
              <th className="px-4 py-3">{t("admin.table.settlement")}</th>
              <th className="px-4 py-3">{t("admin.table.status")}</th>
              <th className="rounded-e-2xl px-4 py-3 text-right">{t("admin.table.actions")}</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {slice.map((booking) => {
              const vehicle = typeof booking.vehicleId === "object" ? booking.vehicleId : null;
              const photo = photoUrl(vehicle?.photos?.[0]);
              return (
                <tr
                  key={booking._id}
                  className="border-b border-slate-100 transition-colors last:border-0 hover:bg-[#EFF4FF]/50"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#EFF4FF] shadow-sm">
                        {photo ? (
                          <img src={photo} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <CalendarDays className="h-5 w-5 text-[#94A3B8]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-bold text-[#0B1C30]">
                          #{referenceCodeFrom(booking._id)}
                        </div>
                        <div className="text-xs text-[#565E74]">{vehicleTitle(booking)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm font-semibold text-[#0B1C30]">
                      {customerName(booking) || "—"}
                    </div>
                    {customerSub(booking) && (
                      <div className="text-xs text-[#565E74]">{customerSub(booking)}</div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-medium text-[#0B1C30]">
                      {providerName(booking) || "—"}
                    </div>
                    {providerCity(booking) && (
                      <div className="text-xs text-[#565E74]">{providerCity(booking)}</div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="max-w-[180px] truncate font-semibold text-[#0B1C30]">
                      {booking.pickupLocation}
                    </div>
                    <div className="text-xs text-[#565E74]">
                      {t("admin.table.days", { count: booking.totalDays })}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm font-extrabold text-[#0B1C30]">
                      {formatLYD(booking.totalAmount)} LYD
                    </div>
                    <span className="mt-0.5 inline-flex">
                      <StatusPill status={booking.paymentStatus} kind="payment" dot={false} />
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <StatusPill status={booking.bookingStatus} kind="booking" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onView(booking)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#EFF4FF] px-3 py-1.5 text-sm font-semibold text-[#2563EB] transition-all hover:bg-[#2563EB] hover:text-white cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                        {t("admin.table.view")}
                      </button>
                      <button
                        type="button"
                        aria-label={t("admin.table.actions")}
                        onClick={() => onView(booking)}
                        className="rounded-lg p-1 text-[#565E74] transition-colors hover:bg-[#EFF4FF] hover:text-[#0B1C30] cursor-pointer"
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
          {t("admin.table.showingOf", {
            shown: slice.length,
            total: bookings.length,
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

export default AdminBookingsTable;