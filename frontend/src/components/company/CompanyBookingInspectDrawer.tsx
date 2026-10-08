import React from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Car,
  CheckCircle2,
  Circle,
  MapPin,
  MessageCircle,
  Phone,
  ScrollText,
  Settings2,
  X,
} from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import type { CompanyBookingRow } from "../../types/companyBookings";

interface CompanyBookingInspectDrawerProps {
  row: CompanyBookingRow | null;
  busy: boolean;
  onClose: () => void;
  /** Advance the booking lifecycle (e.g. CONFIRMED → ACTIVE → COMPLETED). */
  onAdvance: (status: string) => void;
  /** Attest a pending cash-on-delivery payment at pick-up. */
  onCollectCash: (paymentId: string) => void;
  /** Cancel the booking with an operator reason. */
  onCancel: (reason: string) => void;
}

const CHECK_KEYS = ["gps", "ready", "paid", "signed"] as const;

/**
 * Quick Inspect — the dispatch desk's right-hand column. It only surfaces what
 * the tenant's own ledger already answered for the selected booking (pricing,
 * the resolved payment state, payout stage) plus four handover checks derived
 * from real predicates (GPS on the vehicle, availability, payment cleared, and
 * the signed-keys handover which is only true once a future key-sync lands).
 */
export const CompanyBookingInspectDrawer: React.FC<
  CompanyBookingInspectDrawerProps
> = ({ row, busy, onClose, onAdvance, onCollectCash, onCancel }) => {
  const { t } = useTranslation();

  if (!row) {
    return (
      <aside className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <Settings2 className="h-8 w-8 text-[#9AA4B5]" aria-hidden="true" />
        <p className="text-sm font-medium text-[#565E74]">
          {t("company.bookingsPage.inspect.noSelection")}
        </p>
      </aside>
    );
  }

  const detail = row.detail;
  const digits = (detail.customerPhone ?? "").replace(/\D/g, "");
  const whatsapp = digits ? `https://wa.me/${digits}` : null;
  const doneCount = detail.checks.filter((check) => check.done).length;
  const progress = Math.round((doneCount / detail.checks.length) * 100);
  const vehicleTitle =
    detail.title ||
    [row.vehicle.make, row.vehicle.model, row.vehicle.year]
      .filter(Boolean)
      .join(" ") ||
    "NexRide Vehicle";

  const status = row.bookingStatus;
  const terminal = status === "COMPLETED" || status === "CANCELLED" || status === "EXPIRED";
  const cashPending =
    row.ledger?.method === "CASH_ON_DELIVERY" &&
    row.ledger?.status === "PENDING" &&
    Boolean(row.paymentId) &&
    row.payment !== "PAID";

  // The primary CTA follows the real lifecycle state machine (PATCH status is
  // tenant-scoped) so the dispatcher desk advances a booking with one tap:
  // PENDING_PAYMENT (cash) → collect; PAID → CONFIRMED; CONFIRMED → ACTIVE;
  // ACTIVE → COMPLETED. Terminal states owe no further action.
  const primary = (() => {
    if (terminal) {
      return {
        label: t("company.bookingsPage.inspect.terminalAction"),
        hint: undefined,
        action: undefined,
        secondary: false,
      };
    }
    if (status === "PENDING_PAYMENT") {
      if (cashPending) {
        return {
          label: t("company.bookingsPage.inspect.collectCash"),
          hint: undefined,
          action: () => onCollectCash(row.paymentId as string),
          secondary: false,
        };
      }
      return {
        label: t("company.bookingsPage.inspect.waitingPayment"),
        hint: t("company.bookingsPage.inspect.waitingPaymentHint"),
        action: undefined,
        secondary: false,
      };
    }
    if (status === "PAID") {
      return {
        label: t("company.bookingsPage.inspect.confirmBooking"),
        hint: undefined,
        action: () => onAdvance("CONFIRMED"),
        secondary: false,
      };
    }
    if (status === "CONFIRMED") {
      return {
        label: t("company.bookingsPage.inspect.verifyHandover"),
        hint: t("company.bookingsPage.inspect.verifyHandoverHint"),
        action: () => onAdvance("ACTIVE"),
        secondary: false,
      };
    }
    if (status === "ACTIVE") {
      return {
        label: t("company.bookingsPage.inspect.completeRental"),
        hint: undefined,
        action: () => onAdvance("COMPLETED"),
        secondary: false,
      };
    }
    return {
      label: t("company.bookingsPage.inspect.terminalAction"),
      hint: undefined,
      action: undefined,
      secondary: false,
    };
  })();

  const handleCancelClick = () => {
    if (busy) return;
    const reason = window.prompt(t("company.bookingsPage.inspect.cancelPrompt"));
    if (reason === null) return;
    onCancel(reason.trim());
  };

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
      {/* Quick Inspect card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold tracking-tight text-[#0B1C30]">
              {t("company.bookingsPage.inspect.title")}
            </h2>
            <span className="font-mono text-[11px] font-bold text-[#2563EB]">
              {row.reference}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9AA4B5] transition-colors hover:bg-[#F1F5F9] hover:text-[#0B1C30] cursor-pointer"
            aria-label={t("company.bookingsPage.inspect.close")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* Vehicle */}
          <div className="flex items-center gap-3 rounded-xl border border-[#E5EEFF] bg-[#F8FAFF] p-3">
            {detail.photo ? (
              <img
                src={detail.photo}
                alt={vehicleTitle}
                className="h-14 w-20 shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
            ) : (
              <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-[#E5EEFF] text-[#2563EB]">
                <Car className="h-6 w-6" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#0B1C30]">
                {vehicleTitle}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {detail.vehicleType && (
                  <span className="rounded bg-[#E5EEFF] px-1.5 py-0.5 text-[10px] font-bold text-[#2563EB]">
                    {detail.vehicleType}
                  </span>
                )}
                {detail.vehicleHub && (
                  <span className="rounded bg-[#EFF4FF] px-1.5 py-0.5 text-[10px] font-bold text-[#565E74]">
                    {t("company.bookingsPage.inspect.vehicleHub", {
                      hub: detail.vehicleHub,
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DCE9FF] text-xs font-bold text-[#2563EB]">
                {row.customer.initials}
              </span>
              <div className="min-w-0 flex items-center gap-1.5">
                <p className="truncate text-sm font-bold text-[#0B1C30]">
                  {detail.customerName}
                </p>
                {row.verified && (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-[#0E6B34]" aria-hidden="true" />
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DDF4E4] text-[#0E6B34] transition-colors hover:bg-[#C6EBD3]"
                  aria-label={t("company.bookingsPage.inspect.whatsapp")}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
              {digits && (
                <a
                  href={`tel:${digits}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#2563EB] transition-colors hover:bg-[#E5EEFF]"
                  aria-label={t("company.bookingsPage.inspect.directCall")}
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>

          {/* Pickup */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#F1F5F9] bg-[#F8FAFF] px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-[#565E74]" aria-hidden="true" />
              <span className="truncate text-[13px] font-medium text-[#0B1C30]">
                {detail.pickupLocation ||
                  t("company.bookingsPage.inspect.branchPickup")}
              </span>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                detail.pickupMethod === "DELIVERY"
                  ? "bg-[#DCE9FF] text-[#2563EB]"
                  : "bg-[#EFF4FF] text-[#565E74]"
              }`}
            >
              {detail.pickupMethod === "DELIVERY"
                ? t("company.bookingsPage.inspect.deliveryTag")
                : t("company.bookingsPage.inspect.branchTag")}
            </span>
          </div>

          {/* Pricing */}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-3">
            <div className="rounded-xl border border-[#F1F5F9] p-3">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.bookingsPage.inspect.rate")}
              </dt>
              <dd className="mt-1 font-mono text-[15px] font-extrabold text-[#0B1C30]">
                {formatLYD(detail.dailyRate)}{" "}
                <span className="text-[11px] font-semibold text-[#9AA4B5]">LYD</span>
              </dd>
            </div>
            <div className="rounded-xl border border-[#F1F5F9] p-3">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.bookingsPage.inspect.duration")}
              </dt>
              <dd className="mt-1 text-[15px] font-extrabold text-[#0B1C30]">
                {detail.totalDays}{" "}
                <span className="text-[11px] font-semibold text-[#9AA4B5]">
                  {t("company.bookingsPage.inspect.daysUnit")}
                </span>
              </dd>
            </div>
            <div className="rounded-xl border border-[#F1F5F9] p-3">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                {t("company.bookingsPage.inspect.total")}
              </dt>
              <dd className="mt-1 font-mono text-[15px] font-extrabold text-[#0B1C30]">
                {formatLYD(detail.totalAmount)}{" "}
                <span className="text-[11px] font-semibold text-[#9AA4B5]">LYD</span>
              </dd>
            </div>
            <div className="rounded-xl border border-[#DDF4E4] bg-[#F3FBF5] p-3">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-[#0E6B34]">
                {t("company.bookingsPage.inspect.netShare")}
              </dt>
              <dd className="mt-1 font-mono text-[15px] font-extrabold text-[#0E6B34]">
                {formatLYD(detail.companyShare)}{" "}
                <span className="text-[11px] font-semibold text-[#4B8C62]">LYD</span>
              </dd>
            </div>
          </dl>

          {/* Handover progress */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-[#0B1C30]">
                {t("company.bookingsPage.inspect.handover")}
              </h3>
              <span className="text-[11px] font-bold text-[#565E74]">
                {doneCount}/{detail.checks.length}
              </span>
            </div>
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-[#E5EEFF]">
              <div
                className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <ul className="flex flex-col gap-2">
              {CHECK_KEYS.map((key) => {
                const check = detail.checks.find((c) => c.key === key);
                const done = check?.done ?? false;
                return (
                  <li
                    key={key}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold ${
                      done
                        ? "bg-[#F3FBF5] text-[#0E6B34]"
                        : "bg-[#F8FAFF] text-[#565E74]"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                    {t(`company.bookingsPage.inspect.check${key}`)}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={busy || !primary.action}
              title={primary.hint}
              onClick={primary.action}
              className="w-full rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)] transition-all hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#9AA4B5] disabled:opacity-60"
            >
              {busy
                ? t("company.bookingsPage.inspect.saving")
                : primary.label}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={terminal || busy}
                onClick={handleCancelClick}
                title={
                  terminal
                    ? t("company.bookingsPage.inspect.terminalCaption")
                    : t("company.bookingsPage.inspect.cancelHint")
                }
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#FFEDED] px-4 py-2.5 text-sm font-semibold text-[#BA1A1A] transition-all hover:bg-[#FFDBE0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("company.bookingsPage.inspect.cancelBooking")}
              </button>
              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#DDF4E4] px-4 py-2.5 text-sm font-semibold text-[#0E6B34] transition-colors hover:bg-[#C6EBD3]"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  {t("company.bookingsPage.inspect.messageDriver")}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Protocol card */}
      <div className="rounded-2xl border border-[#E5EEFF] bg-[#F8FAFF] p-4">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
          <h3 className="text-[13px] font-bold text-[#0B1C30]">
            {t("company.bookingsPage.inspect.protocolTitle")}
          </h3>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#565E74]">
          {t("company.bookingsPage.inspect.protocolBody")}
        </p>
      </div>
    </aside>
  );
};

export default CompanyBookingInspectDrawer;