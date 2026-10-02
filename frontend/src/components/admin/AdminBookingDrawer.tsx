import React from "react";
import { useTranslation } from "react-i18next";
import {
  Building2,
  CalendarDays,
  MapPin,
  Phone,
  User,
  X,
} from "lucide-react";
import type { BookingDto } from "../../types/booking";
import {
  formatDate,
  formatLYD,
  referenceCodeFrom,
  vehicleTitle,
} from "../../lib/bookingView";
import { photoUrl } from "../../lib/vehicleMapper";
import { StatusPill } from "./StatusPill";

interface AdminBookingDrawerProps {
  booking: BookingDto | null;
  onClose: () => void;
}

const refName = (
  value: string | { _id: string; name?: string } | null | undefined,
): string | null =>
  typeof value === "object" && value !== null && value.name ? value.name : null;

const refPhone = (
  value: string | { _id: string; phoneNumber?: string } | null | undefined,
): string | null =>
  typeof value === "object" && value !== null && value.phoneNumber
    ? value.phoneNumber
    : null;

/** Real booking record rendered from the admin list response (no mocks). */
export const AdminBookingDrawer: React.FC<AdminBookingDrawerProps> = ({
  booking,
  onClose,
}) => {
  const { t, i18n } = useTranslation();

  if (!booking) return null;

  const vehicle = typeof booking.vehicleId === "object" ? booking.vehicleId : null;
  const customer = typeof booking.customerId === "object" ? booking.customerId : null;
  const company = typeof booking.companyId === "object" ? booking.companyId : null;
  const photo = photoUrl(vehicle?.photos?.[0]);

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#0B1C30]/40" onClick={onClose} />

      <aside className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-[0_24px_48px_-8px_rgba(15,23,42,0.14)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#0B1C30]">
              {t("admin.drawer.title")} #{referenceCodeFrom(booking._id)}
            </h3>
            <p className="text-xs text-[#565E74]">
              {t("admin.drawer.created", {
                date: formatDate(booking.createdAt, i18n.language, true),
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("admin.drawer.close")}
            className="rounded-lg p-2 text-[#565E74] transition-colors hover:bg-[#EFF4FF] hover:text-[#0B1C30] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <StatusPill status={booking.bookingStatus} kind="booking" size="md" />
            <StatusPill status={booking.paymentStatus} kind="payment" size="md" />
          </div>

          {/* Vehicle */}
          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#EFF4FF]">
                {photo ? (
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <CalendarDays className="h-7 w-7 text-[#94A3B8]" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-[#0B1C30]">{vehicleTitle(booking)}</p>
                <p className="mt-0.5 text-xs text-[#565E74]">
                  {vehicle?.transmission ?? "—"} • {vehicle?.fuelType ?? "—"} •{" "}
                  {t("admin.drawer.seats", { count: vehicle?.seats ?? 0 })}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-[#2563EB]">
                  {formatLYD(booking.dailyRate)} LYD {t("admin.drawer.perDay")}
                </p>
              </div>
            </div>
          </section>

          {/* Client */}
          <section className="rounded-2xl border border-slate-200 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              {t("admin.drawer.client")}
            </h4>
            <div className="mt-2 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-white">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0B1C30]">
                  {refName(customer) ?? `${t("admin.drawer.unknown")} · ${customer?._id ?? "—"}`}
                </p>
                {refPhone(customer) && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-[#565E74]">
                    <Phone className="h-3.5 w-3.5" /> {refPhone(customer)}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Provider */}
          <section className="rounded-2xl border border-slate-200 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              {t("admin.drawer.provider")}
            </h4>
            <div className="mt-2 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#2563EB]">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0B1C30]">
                  {refName(company) ?? `${t("admin.drawer.unknown")} · ${company?._id ?? "—"}`}
                </p>
                {(company?.phone || company?.city) && (
                  <p className="mt-0.5 text-xs text-[#565E74]">
                    {[company?.phone, company?.city]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Trip */}
          <section className="rounded-2xl border border-slate-200 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              {t("admin.drawer.trip")}
            </h4>
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex items-start gap-2 text-[#0B1C30]">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                <div>
                  <p className="font-semibold">
                    {formatDate(booking.startDate, i18n.language, true)} →{" "}
                    {formatDate(booking.endDate, i18n.language, true)}
                  </p>
                  <p className="text-xs text-[#565E74]">
                    {t("admin.drawer.duration", { count: booking.totalDays })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-[#0B1C30]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                <p className="font-semibold">{booking.pickupLocation}</p>
              </div>
            </div>
          </section>

          {/* Settlement */}
          <section className="rounded-2xl border border-slate-200 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              {t("admin.drawer.settlement")}
            </h4>
            <dl className="mt-2 space-y-1.5 text-sm">
              <Row label={t("admin.drawer.rentalPrice")} value={`${formatLYD(booking.rentalPrice)} LYD`} />
              <Row label={t("admin.drawer.discount")} value={`− ${formatLYD(booking.discountAmount)} LYD`} />
              <Row label={t("admin.drawer.commission")} value={`${formatLYD(booking.commissionAmount)} LYD (${booking.commissionRate}%)`} />
              <Row label={t("admin.drawer.companyShare")} value={`${formatLYD(booking.companyShare)} LYD`} />
              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <dt className="font-bold text-[#0B1C30]">{t("admin.drawer.total")}</dt>
                <dd className="font-extrabold text-[#0B1C30]">
                  {formatLYD(booking.totalAmount)} LYD
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </aside>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <dt className="text-[#565E74]">{label}</dt>
    <dd className="font-semibold text-[#0B1C30]">{value}</dd>
  </div>
);

export default AdminBookingDrawer;