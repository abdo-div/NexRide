import React from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Banknote,
  CalendarRange,
  Car,
  CircleX,
  FileDown,
  Landmark,
  MapPin,
  Phone,
  ReceiptText,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  formatDate,
  moneyOf,
  rentalDaysOf,
  vehicleLineOf,
  viewStatusOf,
} from "../../lib/companyEarningsView";
import type {
  CompanyEarningsRow,
  CompanyEarningsSettings,
  PaymentMethod,
} from "../../types/companyEarnings";

const METHOD_ICON: Record<PaymentMethod, React.ComponentType<{ className?: string }>> = {
  CASH_ON_DELIVERY: Banknote,
  LOCAL_CARD: BadgeCheck,
  MOAMALAT: BadgeCheck,
  WALLET: Wallet,
};

const METHOD_KEY: Record<PaymentMethod, string> = {
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

const AuditLine: React.FC<{ label: string; value: string; negative?: boolean; bold?: boolean }> = ({
  label,
  value,
  negative = false,
  bold = false,
}) => (
  <div className="flex items-center justify-between gap-2 py-2">
    <span className="text-[12px] font-semibold text-[#64748B]">{label}</span>
    <span
      className={`text-[13px] ${
        bold ? "font-extrabold text-[#0B1C30]" : negative ? "font-bold text-[#B45309]" : "font-bold text-[#0B1C30]"
      }`}
    >
      {value}
    </span>
  </div>
);

interface CompanyTransactionDrawerProps {
  row: CompanyEarningsRow;
  settings: CompanyEarningsSettings;
  lang: string;
  busy: boolean;
  onClose: () => void;
  onDownloadPdf: (row: CompanyEarningsRow) => void;
}

/**
 * Per-transaction audit drawer: the full context of one settled payout — gateway,
 * customer, vehicle, rental window and depot — plus the itemized commission
 * breakdown (base rate → discount → fee → net) and the wire schedule. Every
 * value mirrors an actual Payment document; nothing is synthesized.
 */
export const CompanyTransactionDrawer: React.FC<CompanyTransactionDrawerProps> = ({
  row,
  settings,
  lang,
  busy,
  onClose,
  onDownloadPdf,
}) => {
  const { t } = useTranslation();
  const variant = viewStatusOf(row.status, row.payoutStatus);
  const MethodIcon = METHOD_ICON[row.paymentMethod];
  const methodKey = METHOD_KEY[row.paymentMethod];
  const booking = row.booking;
  const days =
    booking && booking.startDate && booking.endDate
      ? rentalDaysOf(booking.startDate, booking.endDate)
      : booking?.totalDays ?? null;
  const timestamp = row.paidAt ?? row.createdAt;
  const discount = booking && booking.discountAmount > 0 ? booking.discountAmount : 0;
  const net = row.companyShare;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
        onClick={busy ? undefined : onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("company.payoutsPage.drawer.title")}
        className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-[0_24px_48px_-8px_rgba(15,23,42,0.3)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-[#F8FAFC] px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
                <ReceiptText className="h-3 w-3" aria-hidden="true" />
                {t("company.payoutsPage.drawer.badge")}
              </span>
            </div>
            <h2 className="mt-2 text-[16px] font-extrabold tracking-tight text-[#0B1C30]">
              {t("company.payoutsPage.drawer.title")}
            </h2>
            <p className="font-mono text-[12px] font-bold text-[#2563EB]">{row.trxRef}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#565E74] transition-colors hover:bg-[#EFF4FF] hover:text-[#0B1C30] cursor-pointer"
            aria-label={t("company.payoutsPage.drawer.close")}
          >
            <CircleX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Status + gateway */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[variant]}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              {t(`company.payoutsPage.rows.status.${variant}`)}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-bold text-[#565E74]"
              title={t(`company.payoutsPage.rows.method.${methodKey}`)}
            >
              <MethodIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {t(`company.payoutsPage.rows.method.${methodKey}`)}
            </span>
          </div>

          {timestamp && (
            <p className="text-[11px] font-semibold text-[#9AA4B5]">
              {t("company.payoutsPage.drawer.captured", {
                date: formatDate(timestamp, lang),
              })}
            </p>
          )}

          {/* Customer */}
          <section className="rounded-2xl border border-slate-100 bg-[#F8FAFF] p-4">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[#9AA4B5]">
              {t("company.payoutsPage.drawer.customer")}
            </h3>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E5EEFF] text-[#2563EB]">
                {row.customer.photo ? (
                  <img
                    src={row.customer.photo}
                    alt={row.customer.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-[#0B1C30]">{row.customer.name}</p>
                <p className="flex items-center gap-1 text-[12px] font-semibold text-[#64748B]">
                  <Phone className="h-3 w-3" aria-hidden="true" />
                  {row.customer.phone ?? "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Vehicle + rental */}
          {row.vehicle && (
            <section className="rounded-2xl border border-slate-100 bg-[#F8FAFF] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#E5EEFF] text-[#2563EB]">
                  {row.vehicle.photo ? (
                    <img
                      src={row.vehicle.photo}
                      alt={row.vehicle.make}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Car className="h-5 w-5" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-[#0B1C30]">
                    {vehicleLineOf(row.vehicle)}
                  </p>
                  <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#64748B]">
                    <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
                    {booking && booking.startDate
                      ? `${formatDate(booking.startDate, lang)} → ${
                          booking.endDate ? formatDate(booking.endDate, lang) : "—"
                        }`
                      : "—"}
                    {days !== null && days !== undefined && (
                      <span className="rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[10px] font-bold text-[#2563EB]">
                        {t("company.payoutsPage.rows.rental", { days })}
                      </span>
                    )}
                  </p>
                  {booking?.pickupLocation && (
                    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#64748B]">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {booking.pickupLocation}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Itemized audit */}
          <section className="rounded-2xl border border-slate-100 p-4">
            <h3 className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#9AA4B5]">
              <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
              {t("company.payoutsPage.drawer.itemized")}
            </h3>
            <div className="mt-2 divide-y divide-[#F1F5F9]">
              <AuditLine
                label={t("company.payoutsPage.drawer.baseRate")}
                value={moneyOf(booking?.rentalPrice ?? row.amount)}
              />
              {discount > 0 && (
                <AuditLine
                  label={t("company.payoutsPage.drawer.discount")}
                  value={`-${moneyOf(discount)}`}
                  negative
                />
              )}
              <AuditLine
                label={t("company.payoutsPage.drawer.commission", {
                  rate: row.commissionRate.toFixed(1),
                })}
                value={`-${moneyOf(row.commissionAmount)}`}
                negative
              />
              <div className="flex items-center justify-between gap-2 border-t border-[#F1F5F9] pt-2.5">
                <span className="text-[13px] font-extrabold text-[#0B1C30]">
                  {t("company.payoutsPage.drawer.net")}
                </span>
                <span
                  className={`text-[15px] font-extrabold ${
                    net < 0 ? "text-[#E11D48]" : "text-[#0B1C30]"
                  }`}
                >
                  {net < 0 ? `-${moneyOf(Math.abs(net))}` : moneyOf(net)}
                </span>
              </div>
            </div>
          </section>

          {/* Settlement schedule */}
          <div className="flex items-start gap-2.5 rounded-xl bg-[#EFF4FF] p-3.5">
            <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" aria-hidden="true" />
            <p className="text-[12px] font-medium leading-relaxed text-[#434655]">
              {t("company.payoutsPage.drawer.wire", {
                schedule: settings.payoutSchedule,
                bank: settings.clearingBank,
              })}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl bg-[#F1F5F9] px-4 py-2.5 text-[13px] font-bold text-[#565E74] transition-colors hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {t("company.payoutsPage.drawer.close")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDownloadPdf(row)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition-colors enabled:hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
            {t("company.payoutsPage.drawer.downloadPdf")}
          </button>
        </div>
      </aside>
    </div>
  );
};

export default CompanyTransactionDrawer;