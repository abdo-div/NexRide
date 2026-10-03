import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  BadgeCheck,
  ExternalLink,
  Landmark,
  Percent,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import type {
  AdminCompanyDto,
  AdminCustomerDto,
  AdminPaymentDto,
} from "../../types/admin";
import type { BookingDto } from "../../types/booking";
import {
  formatDate,
  formatLYD,
  referenceCodeFrom,
} from "../../lib/bookingView";
import {
  bookingOfPayment,
  companyOfPayment,
  customerOfPayment,
  trxRefOf,
} from "../../lib/paymentView";
import { StatusPill } from "./StatusPill";

export interface PaymentDossierPanelProps {
  payment: AdminPaymentDto;
  bookings: BookingDto[];
  customers: AdminCustomerDto[];
  companies: AdminCompanyDto[];
  onOpenBooking: (payment: AdminPaymentDto) => void;
}

/** Financial dossier for a single real ledger record. */
export const PaymentDossierPanel: React.FC<PaymentDossierPanelProps> = ({
  payment,
  bookings,
  customers,
  companies,
  onOpenBooking,
}) => {
  const { t, i18n } = useTranslation();
  const booking = bookingOfPayment(bookings, payment);
  const customer = customerOfPayment(customers, payment);
  const company = companyOfPayment(companies, payment);
  const paidAt = payment.paidAt ?? null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      {/* Dossier header */}
      <div className="rounded-t-2xl bg-gradient-to-r from-[#2563EB]/5 via-transparent to-transparent p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                {t("admin.payments.dossier.title")}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-[#0B1C30]">
                  {trxRefOf(payment)}
                </span>
                <StatusPill status={payment.status} kind="payment" />
                <StatusPill status={payment.payoutStatus} kind="payout" dot={false} />
              </div>
              {booking && (
                <button
                  type="button"
                  onClick={() => onOpenBooking(payment)}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-[#2563EB] transition-colors hover:underline cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("admin.payments.dossier.linkedBooking")}: #{referenceCodeFrom(booking._id)}
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start gap-1.5 lg:items-end">
            {paidAt ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                <BadgeCheck className="h-4 w-4" />
                {t("admin.payments.dossier.verified")}
              </span>
            ) : null}
            <span className="text-xs text-[#565E74]">
              {t("admin.payments.dossier.recordedAt", {
                date: formatDate(payment.createdAt ?? "", i18n.language),
              })}
            </span>
            {paidAt && (
              <span className="text-xs text-[#565E74]">
                {t("admin.payments.dossier.paidAt", {
                  date: formatDate(paidAt, i18n.language),
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-12">
        {/* Left column: financial ledger + gateway footprint */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#0B1C30]">
              <Percent className="h-4 w-4 text-[#2563EB]" />
              {t("admin.payments.dossier.ledgerTitle")}
            </h3>
            <div className="space-y-2">
              <LedgerRow
                tone="bg-[#EFF4FF]"
                iconTone="bg-emerald-100 text-emerald-700"
                icon={<BadgeCheck className="h-[18px] w-[18px]" />}
                label={t("admin.payments.dossier.paidByCustomer")}
                sub={`${customer?.name ?? t("admin.payments.dossier.unknown")} • ${company?.name ?? t("admin.payments.dossier.unknown")}`}
                value={`${formatLYD(payment.amount)} LYD`}
                valueClass="text-[#0B1C30]"
              />
              <LedgerRow
                tone="bg-white"
                iconTone="bg-[#E5EEFF] text-[#2563EB]"
                icon={<Percent className="h-[18px] w-[18px]" />}
                label={t("admin.payments.dossier.commission", {
                  rate: payment.commissionRate,
                })}
                sub={t("admin.payments.dossier.commissionSub")}
                value={`- ${formatLYD(payment.commissionAmount)} LYD`}
                valueClass="text-[#2563EB]"
              />
              <LedgerRow
                tone="bg-white"
                iconTone="bg-amber-100 text-amber-700"
                icon={<Landmark className="h-[18px] w-[18px]" />}
                label={t("admin.payments.dossier.payout")}
                sub={t("admin.payments.dossier.payoutSub")}
                value={`${formatLYD(payment.companyShare)} LYD`}
                valueClass="text-[#0B1C30]"
              />
            </div>
          </section>

          <section className="rounded-2xl bg-[#EFF4FF] p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#565E74]">
              <ShieldCheck className="h-4 w-4 text-[#2563EB]" />
              {t("admin.payments.dossier.gatewayTitle")}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <GatewayField
                label={t("admin.payments.dossier.method")}
                value={t(`admin.payments.methods.${payment.paymentMethod ?? ""}`, {
                  defaultValue: payment.paymentMethod ?? t("admin.payments.dossier.unknown"),
                })}
              />
              <GatewayField
                label={t("admin.payments.dossier.gateway")}
                value={payment.paymentGateway ?? t("admin.payments.dossier.unknown")}
              />
              <GatewayField
                label={t("admin.payments.dossier.trxId")}
                value={payment.transactionId ?? t("admin.payments.dossier.unknown")}
                mono
              />
              <GatewayField
                label={t("admin.payments.dossier.merchantRef")}
                value={payment.merchantReference ?? t("admin.payments.dossier.unknown")}
                mono
                wide
              />
              <GatewayField
                label={t("admin.payments.dossier.currency")}
                value={payment.currency ?? "LYD"}
              />
              <GatewayField
                label={t("admin.payments.dossier.payoutStatus")}
                value={t(`admin.status.${payment.payoutStatus}`)}
              />
            </div>
          </section>
        </div>

        {/* Right column: ledger timeline */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#0B1C30]">
              <Receipt className="h-4 w-4 text-[#2563EB]" />
              {t("admin.payments.dossier.timelineTitle")}
            </h3>
            <div className="relative space-y-4 pl-5">
              <TimelineStep
                done
                title={t("admin.payments.dossier.recorded")}
                meta={formatDate(payment.createdAt ?? "", i18n.language, true)}
              />
              <TimelineStep
                done={Boolean(paidAt)}
                pulse={!paidAt}
                title={t("admin.payments.dossier.paid")}
                meta={
                  paidAt
                    ? formatDate(paidAt, i18n.language, true)
                    : t("admin.payments.dossier.notYet")
                }
              />
              <TimelineStep
                done
                title={t("admin.payments.dossier.updated")}
                meta={formatDate(payment.updatedAt ?? payment.createdAt ?? "", i18n.language, true)}
              />
            </div>
          </section>

          {booking && (
            <button
              type="button"
              onClick={() => onOpenBooking(payment)}
              className="flex items-center justify-between rounded-xl bg-[#EFF4FF] px-4 py-3 text-sm font-bold text-[#2563EB] transition-all hover:bg-[#E5EEFF] cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" />
                {t("admin.payments.dossier.openBooking")}
              </span>
              <span className="font-mono text-xs">#{referenceCodeFrom(booking._id)}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface LedgerRowProps {
  tone: string;
  iconTone: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  value: string;
  valueClass: string;
}

const LedgerRow: React.FC<LedgerRowProps> = ({
  tone,
  iconTone,
  icon,
  label,
  sub,
  value,
  valueClass,
}) => (
  <div className={`flex items-center justify-between gap-3 rounded-xl p-3 ${tone}`}>
    <div className="flex min-w-0 items-center gap-2">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconTone}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-bold text-[#0B1C30]">{label}</div>
        <div className="truncate text-[11px] text-[#565E74]">{sub}</div>
      </div>
    </div>
    <span className={`shrink-0 text-sm font-extrabold ${valueClass}`}>{value}</span>
  </div>
);

interface GatewayFieldProps {
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
}

const GatewayField: React.FC<GatewayFieldProps> = ({ label, value, mono, wide }) => (
  <div className={wide ? "sm:col-span-2" : ""}>
    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#565E74]">
      {label}
    </span>
    <span
      className={`mt-0.5 block truncate text-xs font-semibold text-[#0B1C30] ${
        mono ? "font-mono" : ""
      }`}
    >
      {value}
    </span>
  </div>
);

interface TimelineStepProps {
  done: boolean;
  pulse?: boolean;
  title: string;
  meta: string;
}

const TimelineStep: React.FC<TimelineStepProps> = ({ done, pulse, title, meta }) => (
  <div className="relative">
    <span
      className={`absolute -left-5 top-1 h-3.5 w-3.5 rounded-full ring-4 ring-white ${
        done ? "bg-emerald-500" : "bg-amber-400"
      } ${pulse ? "animate-pulse" : ""}`}
    />
    <div className="text-[13px] font-bold text-[#0B1C30]">{title}</div>
    <div className="mt-0.5 text-xs text-[#565E74]">{meta}</div>
  </div>
);

export default PaymentDossierPanel;