import React from "react";
import { useTranslation } from "react-i18next";
import { formatLYD, formatDate, rentalDays } from "../../lib/bookingView";
import type {
  CompanyDashboardData,
  CompanyUpcomingBooking,
} from "../../types/companyDashboard";

interface CompanyUpcomingBookingsProps {
  data: CompanyDashboardData;
  lang: string;
}

const STATUS_STYLES: Record<
  string,
  { key: string; className: string; pulse?: boolean }
> = {
  PENDING_PAYMENT: {
    key: "company.bookings.statusEscrow",
    className: "bg-[#FFDBE0] text-[#BA1A1A]",
  },
  PAID: {
    key: "company.bookings.statusPaid",
    className: "bg-[#E5EEFF] text-[#434655]",
  },
  CONFIRMED: {
    key: "company.bookings.statusConfirmed",
    className: "bg-[#DCE9FF] text-[#2563EB]",
    pulse: true,
  },
  ACTIVE: {
    key: "company.bookings.statusActive",
    className: "bg-[#DCE9FF] text-[#2563EB]",
    pulse: true,
  },
};

const statusStyle = (status: string) =>
  STATUS_STYLES[status] ?? {
    key: "company.bookings.statusUpcoming",
    className: "bg-[#E5EEFF] text-[#2563EB]",
  };

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";

const vehicleName = (b: CompanyUpcomingBooking): string => {
  const base = [b.vehicleMake, b.vehicleModel].filter(Boolean).join(" ");
  return b.vehicleYear ? `${base} (${b.vehicleYear})` : base || "NexRide Vehicle";
};

/**
 * Next upcoming operations, soonest first (server-capped). Columns follow the
 * dispatch desk's needs: reference, customer, vehicle, pickup window, amount.
 */
export const CompanyUpcomingBookings: React.FC<CompanyUpcomingBookingsProps> = ({
  data,
  lang,
}) => {
  const { t } = useTranslation();
  const rows = data.upcomingBookings;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#0B1C30]">
              {t("company.bookings.title")}
            </h2>
            <span className="text-sm text-[#565E74]">({t("company.bookings.titleAr")})</span>
          </div>
          <span className="text-sm text-[#434655]">{t("company.bookings.subtitle")}</span>
        </div>
        <button
          type="button"
          disabled
          title={t("company.layout.soon")}
          className="hidden shrink-0 items-center gap-1 text-sm font-bold text-[#2563EB] transition-colors hover:underline disabled:opacity-60 disabled:cursor-not-allowed sm:inline-flex"
        >
          {t("company.bookings.viewAll", { count: rows.length })}
          <span aria-hidden="true">›</span>
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-xl bg-[#F8FAFC] text-center text-sm text-[#64748B]">
          {t("company.bookings.empty")}
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-start">
            <thead>
              <tr className="bg-[#E5EEFF] text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                <th className="rounded-s-xl px-4 py-3 text-start">{t("company.bookings.colRef")}</th>
                <th className="px-4 py-3 text-start">{t("company.bookings.colCustomer")}</th>
                <th className="px-4 py-3 text-start">{t("company.bookings.colVehicle")}</th>
                <th className="px-4 py-3 text-start">{t("company.bookings.colPickup")}</th>
                <th className="px-4 py-3 text-start">{t("company.bookings.colAmount")}</th>
                <th className="rounded-e-xl px-4 py-3 text-start">{t("company.bookings.colStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EEFF]">
              {rows.map((b) => {
                const style = statusStyle(b.bookingStatus);
                return (
                  <tr key={b.id} className="transition-colors hover:bg-[#F1F5F9]">
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm font-bold text-[#2563EB]">
                          {b.reference}
                        </span>
                        <span className="text-[11px] text-[#565E74]">
                          {rentalDays(b.startDate, b.endDate)} {t("company.bookings.nights")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DCE9FF] text-xs font-bold text-[#2563EB]">
                          {initials(b.customerName)}
                        </span>
                        <span className="text-sm font-semibold text-[#0B1C30]">
                          {b.customerName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-[#0B1C30]">
                        {vehicleName(b)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[#0B1C30]">
                          {formatDate(b.startDate, lang)}
                        </span>
                        <span className="text-[11px] text-[#565E74]">
                          {b.pickupLocation || t("company.bookings.branchPickup")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm font-extrabold text-[#0B1C30]">
                          {formatLYD(b.totalAmount)} LYD
                        </span>
                        <span className="text-[11px] text-[#565E74]">
                          {t("company.bookings.netOf", {
                            value: formatLYD(b.companyShare),
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${style.className}`}
                      >
                        {style.pulse && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2563EB]" />}
                        {t(style.key)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col justify-between gap-2 border-t border-[#F1F5F9] pt-3 text-xs text-[#565E74] sm:flex-row sm:items-center">
        <span>
          {t("company.bookings.showingNext", { count: rows.length })}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
            {t("company.bookings.autoAssign")}
          </span>
          <span className="h-2 w-2 rounded-full bg-[#0053DB]" />
        </span>
      </div>
    </section>
  );
};

export default CompanyUpcomingBookings;