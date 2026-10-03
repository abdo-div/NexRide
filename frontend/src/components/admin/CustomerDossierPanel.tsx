import React from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FolderOpen,
  LoaderCircle,
  Mail,
  Phone,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import type { AdminCustomerDto, AdminPaymentDto } from "../../types/admin";
import type { BookingDto } from "../../types/booking";
import { formatDate, formatLYD, referenceCodeFrom, vehicleTitle } from "../../lib/bookingView";
import {
  activeBookingsOfCustomer,
  bookingsOfCustomer,
  customerChannels,
  completedBookingsOfCustomer,
  spendOfCustomer,
} from "../../lib/customerView";
import { initialsFrom } from "../../lib/vehicleMapper";
import { StatusPill } from "./StatusPill";

export interface CustomerDossierPanelProps {
  customer: AdminCustomerDto;
  bookings: BookingDto[];
  payments: AdminPaymentDto[];
  onViewBooking: (bookingId: string) => void;
  /** True while a status mutation is in flight for this exact customer. */
  mutating: boolean;
  mutationError: boolean;
  onSuspend: () => void;
  onReactivate: () => void;
  onBan: () => void;
}

/** Inline customer operational dossier below the Customers register (real data). */
export const CustomerDossierPanel: React.FC<CustomerDossierPanelProps> = ({
  customer,
  bookings,
  payments,
  onViewBooking,
  mutating,
  mutationError,
  onSuspend,
  onReactivate,
  onBan,
}) => {
  const { t, i18n } = useTranslation();

  const customerBookings = bookingsOfCustomer(bookings, customer);
  const active = activeBookingsOfCustomer(bookings, customer);
  const completed = completedBookingsOfCustomer(bookings, customer);
  const spend = spendOfCustomer(payments, customer);
  const channels = customerChannels(payments, customer);
  const status = customer.status ?? "ACTIVE";

  const history = customerBookings
    .slice()
    .sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)]">
      {/* -------------------------------------------------------------------- */}
      {/* Dossier header banner */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-[#EAF0FF] px-6 py-5 xl:flex-row xl:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB] text-[22px] font-extrabold text-white shadow-md">
            {initialsFrom(customer.name)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[22px] font-extrabold tracking-tight text-[#0B1C30]">
                {customer.name}
              </h2>
              <StatusPill status={status} kind="user" />
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E5EEFF] px-2.5 py-1 text-[11px] font-bold text-[#2563EB]">
                <BadgeCheck className="h-3.5 w-3.5" />
                {t("admin.customers.dossier.verified")}
              </span>
            </div>
            <p className="mt-1 max-w-2xl truncate text-sm text-[#565E74]">
              #{referenceCodeFrom(customer._id)}
              <span className="mx-2 text-[#C3C6D7]">•</span>
              {t("admin.customers.dossier.subtitle")}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#565E74]">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {customer.email}
              </span>
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {customer.phoneNumber ?? "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {t("admin.customers.table.registered")}:{" "}
                {customer.createdAt ? formatDate(customer.createdAt, i18n.language) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Accountability actions (real status transitions) */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {status === "ACTIVE" && (
            <>
              <button
                type="button"
                disabled={mutating}
                onClick={onBan}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-[#BA1A1A] transition-all hover:bg-[#FFDAD6] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <ShieldAlert className="h-4 w-4" />
                {mutating ? t("admin.customers.dossier.saving") : t("admin.customers.dossier.ban")}
              </button>
              <button
                type="button"
                disabled={mutating}
                onClick={onSuspend}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3.5 py-2 text-sm font-semibold text-[#BA1A1A] transition-all hover:bg-[#FFDAD6] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <ShieldAlert className="h-4 w-4" />
                {mutating ? t("admin.customers.dossier.saving") : t("admin.customers.dossier.suspend")}
              </button>
            </>
          )}
          {(status === "SUSPENDED" || status === "BANNED") && (
            <button
              type="button"
              disabled={mutating}
              onClick={onReactivate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-[0_4px_12px_rgba(5,150,105,0.25)] transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {mutating ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {mutating ? t("admin.customers.dossier.saving") : t("admin.customers.dossier.reactivate")}
            </button>
          )}
        </div>
      </div>

      {mutationError && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-[#BA1A1A]">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {t("admin.customers.dossier.mutationError")}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Real activity metrics strip */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4">
        <KpiTile
          label={t("admin.customers.dossier.kpis.bookings")}
          value={String(customerBookings.length)}
          sub={
            customerBookings.length > 0
              ? t("admin.customers.dossier.kpis.completion", {
                  pct: Math.round((completed.length / customerBookings.length) * 100),
                })
              : t("admin.customers.dossier.empty")
          }
          tone="neutral"
        />
        <KpiTile
          label={t("admin.customers.dossier.kpis.activeNow")}
          value={active.length === 0 ? "—" : String(active.length)}
          sub={
            active.length > 0
              ? t("admin.customers.dossier.kpis.rentals")
              : t("admin.customers.dossier.empty")
          }
          tone="brand"
        />
        <KpiTile
          label={t("admin.customers.dossier.kpis.spend")}
          value={`${formatLYD(spend)}`}
          sub={t("admin.customers.dossier.kpis.spendSub")}
          tone="tertiary"
        />
        <KpiTile
          label={t("admin.customers.dossier.kpis.channels")}
          value={channels.length > 0 ? String(channels.length) : "—"}
          sub={
            channels.length > 0 ? channels.join(" / ") : t("admin.customers.table.noSpend")
          }
          tone="neutral"
        />
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Rental & booking history (real records) */}
      {/* -------------------------------------------------------------------- */}
      <div className="p-6 pt-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-[#0B1C30]">
              <Wallet className="h-5 w-5 text-[#2563EB]" />
              {t("admin.customers.dossier.history")}
            </h3>
            <p className="text-xs text-[#565E74]">
              {t("admin.customers.dossier.historySubtitle", {
                active: active.length,
                total: customerBookings.length,
              })}
            </p>
          </div>
          <span className="rounded-full bg-[#E5EEFF] px-2.5 py-1 text-xs font-bold text-[#2563EB]">
            {t("admin.customers.table.records", { count: customerBookings.length })}
          </span>
        </div>

        {history.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#EFF4FF] text-[10px] font-bold uppercase tracking-wider text-[#565E74]">
                  <th className="px-4 py-2.5">{t("admin.customers.dossier.ref")}</th>
                  <th className="px-4 py-2.5">{t("admin.customers.dossier.vehicle")}</th>
                  <th className="px-4 py-2.5">{t("admin.customers.dossier.company")}</th>
                  <th className="px-4 py-2.5">{t("admin.customers.dossier.duration")}</th>
                  <th className="px-4 py-2.5">
                    {t("admin.customers.dossier.bookingStatus")}
                  </th>
                  <th className="px-4 py-2.5">
                    {t("admin.customers.dossier.paymentStatus")}
                  </th>
                  <th className="px-4 py-2.5 text-right">
                    {t("admin.customers.dossier.amount")}
                  </th>
                  <th className="px-4 py-2.5 text-right">
                    {t("admin.customers.dossier.action")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((b) => {
                  const companyName =
                    typeof b.companyId === "object" ? b.companyId?.name ?? "" : "";
                  return (
                    <tr key={b._id} className="text-xs hover:bg-[#EFF4FF]/40">
                      <td className="px-4 py-3 font-mono font-bold text-[#2563EB]">
                        #{referenceCodeFrom(b._id)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[#0B1C30]">
                          {vehicleTitle(b)}
                        </span>
                        <div className="text-[10px] text-[#565E74]">
                          {formatDate(b.startDate, i18n.language)} →{" "}
                          {formatDate(b.endDate, i18n.language)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#565E74]">{companyName || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#565E74]">
                        {b.totalDays > 0
                          ? t("admin.customers.dossier.days", { count: b.totalDays })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusPill status={b.bookingStatus} kind="booking" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusPill status={b.paymentStatus} kind="payment" />
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#0B1C30]">
                        {formatLYD(b.totalAmount)}{" "}
                        <span className="text-[10px] font-normal text-[#565E74]">LYD</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onViewBooking(b._id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-bold text-[#2563EB] transition-colors hover:bg-[#E5EEFF] cursor-pointer"
                        >
                          {t("admin.customers.dossier.viewBooking")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <FolderOpen className="h-10 w-10 text-[#94A3B8]" />
            <p className="mt-3 text-sm text-[#64748B]">
              {t("admin.customers.dossier.historyEmpty")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

// -----------------------------------------------------------------------------
// Small presentational pieces
// -----------------------------------------------------------------------------

interface KpiTileProps {
  label: string;
  value: string;
  sub: string;
  tone: "neutral" | "brand" | "tertiary";
}

const KpiTile: React.FC<KpiTileProps> = ({ label, value, sub, tone }) => (
  <div className="rounded-xl bg-[#EFF4FF] p-4">
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#565E74]">
      <CreditCard className="h-3.5 w-3.5 text-[#94A3B8]" />
      {label}
    </div>
    <div
      className={`mt-1 truncate text-[20px] font-extrabold tracking-tight ${
        tone === "brand" ? "text-[#2563EB]" : tone === "tertiary" ? "text-[#B54E00]" : "text-[#0B1C30]"
      }`}
    >
      {value}
    </div>
    <div className="mt-0.5 truncate text-[11px] text-[#565E74]">{sub}</div>
  </div>
);

export default CustomerDossierPanel;