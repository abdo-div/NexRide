import React from "react";
import { useTranslation } from "react-i18next";

export type StatusKind = "booking" | "payment" | "payout" | "company" | "vehicle";

const BOOKING_STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-50 text-amber-800",
  PAID: "bg-[#EFF4FF] text-[#2563EB]",
  CONFIRMED: "bg-[#E5EEFF] text-[#1E3A8A]",
  ACTIVE: "bg-emerald-100/70 text-emerald-800",
  COMPLETED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-red-50 text-red-700",
  EXPIRED: "bg-slate-200 text-slate-500",
};

const PAYMENT_STYLES: Record<string, string> = {
  UNPAID: "bg-slate-100 text-slate-500",
  PAID: "bg-emerald-50 text-emerald-700",
  REFUNDED: "bg-amber-50 text-amber-800",
  PARTIALLY_REFUNDED: "bg-amber-50 text-amber-700",
};

const PAYOUT_STYLES: Record<string, string> = {
  UNSETTLED: "bg-amber-50 text-amber-800",
  PROCESSING: "bg-[#EFF4FF] text-[#2563EB]",
  SETTLED: "bg-emerald-50 text-emerald-700",
};

const COMPANY_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  APPROVED: "bg-emerald-50 text-emerald-700",
  SUSPENDED: "bg-red-50 text-red-700",
  REJECTED: "bg-slate-100 text-slate-500",
};

const VEHICLE_STYLES: Record<string, string> = {
  AVAILABLE: "bg-blue-50 text-blue-700",
  MAINTENANCE: "bg-amber-50 text-amber-800",
  UNAVAILABLE: "bg-rose-50 text-rose-700",
};

interface StatusPillProps {
  status: string;
  kind: StatusKind;
  dot?: boolean;
  size?: "sm" | "md";
}

/** Honest status badge rendered from real backend status values. */
export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  kind,
  dot = true,
  size = "sm",
}) => {
  const { t } = useTranslation();
  const pool =
    kind === "booking"
      ? BOOKING_STYLES
      : kind === "payment"
        ? PAYMENT_STYLES
        : kind === "payout"
          ? PAYOUT_STYLES
          : kind === "company"
            ? COMPANY_STYLES
            : VEHICLE_STYLES;
  const tone = pool[status] ?? "bg-slate-100 text-slate-500";
  const dotTone =
    kind === "booking"
      ? status === "ACTIVE"
        ? "bg-emerald-600"
        : "bg-slate-400"
      : kind === "vehicle" && status === "AVAILABLE"
        ? "bg-blue-500"
        : kind === "vehicle" && status === "MAINTENANCE"
          ? "bg-amber-500"
          : kind === "vehicle" && status === "UNAVAILABLE"
            ? "bg-rose-500"
            : "bg-current";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold ${
        size === "sm" ? "text-[11px]" : "text-xs"
      } ${tone}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotTone}`} />}
      {t(`admin.status.${status}`)}
    </span>
  );
};

export default StatusPill;