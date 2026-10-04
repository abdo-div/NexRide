import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  BadgeCheck,
  FileText,
  Landmark,
  Percent,
  Plus,
  Printer,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type {
  AdminCustomerDto,
  AdminPaymentDto,
  AdminPayoutRow,
} from "../../types/admin";
import type { BookingDto } from "../../types/booking";
import type { VehicleDto } from "../../types/vehicle";
import { formatDate, formatLYD, referenceCodeFrom, vehicleTitle } from "../../lib/bookingView";
import { vehicleTitle as vehicleTitleOf } from "../../lib/fleetView";
import {
  effectiveRateOf,
  idOf,
  lfbBatchRefOf,
  payoutCodeOf,
  pendingAmountOf,
  rowCompanyIdOf,
} from "../../lib/commissionView";
import { PayoutStatusChip } from "./PayoutStatusChip";

export interface AdminPayoutDossierProps {
  row: AdminPayoutRow;
  payments: AdminPaymentDto[];
  customers: AdminCustomerDto[];
  bookings: BookingDto[];
  vehicles: VehicleDto[];
  busy: boolean;
  onApprove: (row: AdminPayoutRow) => void;
  onAudit: (row: AdminPayoutRow) => void;
  onOpenBooking?: (payment: AdminPaymentDto) => void;
}

/** Full clearing dossier for a single fleet operator's settlement run. */
export const AdminPayoutDossier: React.FC<AdminPayoutDossierProps> = ({
  row,
  payments,
  customers,
  bookings,
  vehicles,
  busy,
  onApprove,
  onAudit,
}) => {
  const { t, i18n } = useTranslation();
  const code = payoutCodeOf(row);
  const pending = pendingAmountOf(row);
  const rate = row.company?.customCommissionRate ?? effectiveRateOf(row);

  const companyPayments = useMemo(
    () =>
      payments
        .filter((p) => idOf(p.companyId) === rowCompanyIdOf(row))
        .sort((a, b) =>
          (b.paidAt ?? b.createdAt ?? "").localeCompare(a.paidAt ?? a.createdAt ?? ""),
        ),
    [payments, row],
  );

  const liquidated = companyPayments.filter((p) => p.status === "COMPLETED");
  const confirmed = companyPayments.filter((p) => p.status !== "COMPLETED");

  const windowFrom = companyPayments.reduce(
    (acc, p) => {
      const ts = p.paidAt ?? p.createdAt ?? "";
      if (!acc.min || (ts && ts < acc.min)) acc.min = ts;
      if (!acc.max || (ts && ts > acc.max)) acc.max = ts;
      return acc;
    },
    { min: "", max: "" },
  );

  const customerName = (payment: AdminPaymentDto): string => {
    const customer = customers.find((c) => c._id === idOf(payment.customerId));
    return customer?.name ?? t("admin.payments.table.unknown");
  };

  const vehicleName = (payment: AdminPaymentDto): string => {
    const booking = bookings.find((b) => b._id === idOf(payment.bookingId));
    if (!booking) return "—";
    const ref = typeof booking.vehicleId === "object" ? booking.vehicleId : null;
    const id = ref?._id ?? (typeof booking.vehicleId === "string" ? booking.vehicleId : "");
    const vehicle = id ? vehicles.find((v) => v._id === id) : undefined;
    return vehicle ? vehicleTitleOf(vehicle) : vehicleTitle(booking);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      {/* Dossier header */}
      <div className="rounded-t-2xl bg-gradient-to-r from-[#2563EB]/5 via-transparent to-transparent p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                {t("admin.commissions.dossier.title", { code })}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-[#0B1C30]">
                  {row.company?.name ?? t("admin.payments.table.unknown")}
                </span>
                <PayoutStatusChip status={row.payoutStatus} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#EFF4FF] px-2 py-1 font-mono font-bold text-[#2563EB]">
                  <ShieldCheck className="h-3 w-3" />
                  {t("admin.commissions.dossier.batchRef", { ref: lfbBatchRefOf(row) })}
                </span>
                {windowFrom.min && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[#EFF4FF] px-2 py-1 font-semibold text-[#565E74]">
                    {t("admin.commissions.dossier.window", {
                      from: formatDate(windowFrom.min, i18n.language),
                      to: formatDate(windowFrom.max || windowFrom.min, i18n.language),
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:flex-row lg:items-center">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800">
              <Wallet className="h-3.5 w-3.5" />
              {pending > 0
                ? `${formatLYD(pending)} LYD ${t("admin.commissions.dossier.pendingBadge")}`
                : t("admin.commissions.table.viewDossier")}
            </span>
            <button
              type="button"
              onClick={() => onAudit(row)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#EFF4FF] px-3 py-1.5 text-xs font-bold text-[#2563EB] transition-colors enabled:hover:bg-[#2563EB] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              {t("admin.commissions.dossier.auditPdf")}
            </button>
          </div>
        </div>
      </div>

      {/* Balance breakdown */}
      <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2 lg:grid-cols-5">
        <BreakCard
          tone="bg-[#EFF4FF]"
          iconTone="bg-[#2563EB] text-white"
          icon={<Wallet className="h-4 w-4" />}
          label={t("admin.commissions.dossier.grossDispatches", {
            count: liquidated.length,
          })}
          sub={t("admin.commissions.dossier.grossDispatchesSub")}
          value={formatLYD(row.gross)}
          valueClass="text-[#0B1C30]"
        />
        <BreakCard
          tone="bg-white"
          iconTone="bg-[#E5EEFF] text-[#2563EB]"
          icon={<Percent className="h-4 w-4" />}
          label={t("admin.commissions.dossier.platformFee")}
          sub={t("admin.commissions.dossier.platformFeeSub", { rate: rate.toFixed(1) })}
          value={`- ${formatLYD(row.fee)}`}
          valueClass="text-[#2563EB]"
        />
        <BreakCard
          tone="bg-amber-50/70"
          iconTone="bg-amber-100 text-amber-700"
          icon={<Wallet className="h-4 w-4" />}
          label={t("admin.commissions.kpis.pending")}
          sub={t("admin.commissions.kpis.batchScheduled")}
          value={formatLYD(pending)}
          valueClass="text-amber-700"
        />
        <BreakCard
          tone="bg-emerald-50/60"
          iconTone="bg-emerald-100 text-emerald-700"
          icon={<BadgeCheck className="h-4 w-4" />}
          label={t("admin.commissions.kpis.paid")}
          sub={t("admin.commissions.kpis.viaRails")}
          value={formatLYD(row.settled)}
          valueClass="text-emerald-700"
        />
        <div className="flex flex-col justify-between rounded-xl bg-gradient-to-br from-[#0B1C30] to-[#10263F] p-3.5 text-white">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            {t("admin.commissions.dossier.netClearing")}
          </div>
          <div className="mt-1 text-lg font-extrabold tracking-tight">
            {formatLYD(row.net)} <span className="text-xs font-semibold text-slate-400">LYD</span>
          </div>
          <div className="truncate text-[10px] text-slate-400">
            {t("admin.commissions.dossier.netClearingSub")}
          </div>
        </div>
      </div>

      {/* Approve + destinations */}
      <div className="px-6 pb-6">
        <div className="flex flex-col justify-between gap-3 rounded-xl bg-[#EFF4FF] p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E5EEFF] text-[#2563EB]">
              <Landmark className="h-4 w-4" />
            </span>
            <div>
              <div className="text-xs font-bold text-[#0B1C30]">
                {t("admin.commissions.dossier.bankUnknown")}
              </div>
              <div className="text-[11px] text-[#565E74]">
                {row.company?.city ?? ""} • {t("admin.commissions.engineName")}
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={busy || pending <= 0}
            onClick={() => onApprove(row)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-all enabled:hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {t("admin.commissions.dossier.approve", { amount: formatLYD(pending) })}
          </button>
        </div>
      </div>

      {/* Bookings liquidated */}
      <div className="border-t border-slate-100 p-6">
        <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#0B1C30]">
              <ArrowUpRight className="h-4 w-4 text-[#2563EB]" />
              {t("admin.commissions.dossier.tripsTitle", { code })}
            </h3>
            <p className="mt-0.5 text-xs text-[#565E74]">
              {t("admin.commissions.dossier.tripsSub")}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#565E74]">
            <BadgeCheck className="h-4 w-4 text-emerald-600" />
            {liquidated.length} {t("admin.commissions.table.bookings")}
          </span>
        </div>

        {liquidated.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-[#64748B]">
            {t("admin.commissions.dossier.noTrips")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#EFF4FF] text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                  <th className="rounded-s-2xl px-4 py-3">{t("admin.commissions.dossier.tripId")}</th>
                  <th className="px-4 py-3">{t("admin.commissions.dossier.renter")}</th>
                  <th className="px-4 py-3">{t("admin.commissions.dossier.vehicle")}</th>
                  <th className="px-4 py-3 text-right">{t("admin.commissions.dossier.tripGross")}</th>
                  <th className="px-4 py-3 text-right">{t("admin.commissions.dossier.takeRate")}</th>
                  <th className="px-4 py-3 text-right">{t("admin.commissions.dossier.cut")}</th>
                  <th className="px-4 py-3 text-right">{t("admin.commissions.dossier.payout")}</th>
                  <th className="rounded-e-2xl px-4 py-3">{t("admin.commissions.dossier.settledDate")}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {liquidated.slice(0, 8).map((payment) => {
                  const booking = bookings.find((b) => b._id === idOf(payment.bookingId));
                  return (
                    <tr key={payment._id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-mono text-[12px] font-bold text-[#2563EB]">
                          {booking ? `#${referenceCodeFrom(booking._id)}` : `#TRX-${payment._id.slice(-6).toUpperCase()}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="min-w-[150px] truncate text-[13px] font-semibold text-[#0B1C30]">
                          {customerName(payment)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="min-w-[140px] truncate text-[13px] text-[#565E74]">
                          {vehicleName(payment)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-bold text-[#0B1C30]">{formatLYD(payment.amount)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-semibold text-[#565E74]">
                          {payment.commissionRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="text-[13px] font-bold text-[#2563EB]">
                          -{formatLYD(payment.commissionAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="text-[13px] font-bold text-emerald-700">
                          {formatLYD(payment.companyShare)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-[#0B1C30]">
                          {formatDate(payment.payoutSettledAt ?? payment.paidAt ?? payment.createdAt ?? "", i18n.language)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmed but unsettled tally */}
      {confirmed.length > 0 && (
        <div className="flex items-center justify-between px-6 pb-6 text-[11px] text-[#565E74]">
          <span>
            {confirmed.length} {t("admin.commissions.table.bookings")} —{" "}
            {t("admin.commissions.statuses.ADJUSTED")}
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-[#2563EB]">
            <FileText className="h-3.5 w-3.5" />
            {t("admin.commissions.kpis.adjustments")}
          </span>
        </div>
      )}
    </div>
  );
};

interface BreakCardProps {
  tone: string;
  iconTone: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  value: string;
  valueClass: string;
}

const BreakCard: React.FC<BreakCardProps> = ({
  tone,
  iconTone,
  icon,
  label,
  sub,
  value,
  valueClass,
}) => (
  <div className={`flex flex-col justify-between rounded-xl p-3.5 ${tone}`}>
    <div className="flex items-center gap-2">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconTone}`}>
        {icon}
      </span>
      <span className="text-[11px] font-bold text-[#0B1C30]">{label}</span>
    </div>
    <div className={`mt-2 truncate text-base font-extrabold tracking-tight ${valueClass}`}>
      {value}
    </div>
    <div className="truncate text-[10px] text-[#565E74]">{sub}</div>
  </div>
);

export default AdminPayoutDossier;