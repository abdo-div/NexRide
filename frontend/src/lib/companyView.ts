import type { AdminCompanyDto, AdminPaymentDto } from "../types/admin";
import type { BookingDto } from "../types/booking";
import type { VehicleDto } from "../types/vehicle";

/**
 * Booking statuses that represent a live rental window for an operator
 * (payment-secured or in-progress trips). PENDING_PAYMENT and EXPIRED are
 * excluded: they are neither counted as active dispatches nor as occupancy.
 */
export const RESERVED_BOOKING_STATUSES = ["PAID", "CONFIRMED", "ACTIVE"] as const;

const companyIdOf = (
  value: string | { _id?: string } | null | undefined,
): string => {
  if (typeof value === "object" && value) return value._id ?? "";
  return (value ?? "") as string;
};

export const vehiclesOf = (
  vehicles: VehicleDto[],
  company: AdminCompanyDto,
): VehicleDto[] => vehicles.filter((v) => companyIdOf(v.companyId) === company._id);

export const bookingsOf = (
  bookings: BookingDto[],
  company: AdminCompanyDto,
): BookingDto[] => bookings.filter((b) => companyIdOf(b.companyId) === company._id);

export const paymentsOf = (
  payments: AdminPaymentDto[],
  company: AdminCompanyDto,
): AdminPaymentDto[] => payments.filter((p) => companyIdOf(p.companyId) === company._id);

/** Live reservations currently holding this operator's vehicles. */
export const activeBookingsOf = (
  bookings: BookingDto[],
  company: AdminCompanyDto,
): BookingDto[] =>
  bookingsOf(bookings, company).filter((b) =>
    (RESERVED_BOOKING_STATUSES as readonly string[]).includes(b.bookingStatus),
  );

export const completedBookingsOf = (
  bookings: BookingDto[],
  company: AdminCompanyDto,
): BookingDto[] =>
  bookingsOf(bookings, company).filter((b) => b.bookingStatus === "COMPLETED");

export const completedPaymentsOf = (
  payments: AdminPaymentDto[],
  company: AdminCompanyDto,
): AdminPaymentDto[] =>
  paymentsOf(payments, company).filter((p) => p.status === "COMPLETED");

export const unsettledPaymentsOf = (
  payments: AdminPaymentDto[],
  company: AdminCompanyDto,
): AdminPaymentDto[] =>
  paymentsOf(payments, company).filter((p) => p.payoutStatus === "UNSETTLED");

export const settledPaymentsOf = (
  payments: AdminPaymentDto[],
  company: AdminCompanyDto,
): AdminPaymentDto[] =>
  paymentsOf(payments, company).filter((p) => p.payoutStatus === "SETTLED");

const paidOn = (p: AdminPaymentDto): string => p.paidAt ?? p.createdAt ?? "";

/** Gross revenue from completed payments within a trailing window (days). */
export const grossInWindow = (
  payments: AdminPaymentDto[],
  company: AdminCompanyDto,
  days: number,
): number => {
  const from = Date.now() - days * 86400000;
  return completedPaymentsOf(payments, company)
    .filter((p) => new Date(paidOn(p)).getTime() >= from)
    .reduce((sum, p) => sum + p.amount, 0);
};

export const commissionInWindow = (
  payments: AdminPaymentDto[],
  company: AdminCompanyDto,
  days: number,
): number => {
  const from = Date.now() - days * 86400000;
  return completedPaymentsOf(payments, company)
    .filter((p) => new Date(paidOn(p)).getTime() >= from)
    .reduce((sum, p) => sum + p.commissionAmount, 0);
};

export const grossAllTime = (
  payments: AdminPaymentDto[],
  company: AdminCompanyDto,
): number =>
  completedPaymentsOf(payments, company).reduce((sum, p) => sum + p.amount, 0);

export const commissionAllTime = (
  payments: AdminPaymentDto[],
  company: AdminCompanyDto,
): number =>
  completedPaymentsOf(payments, company).reduce(
    (sum, p) => sum + p.commissionAmount,
    0,
  );

export const unsettledShare = (
  payments: AdminPaymentDto[],
  company: AdminCompanyDto,
): number =>
  unsettledPaymentsOf(payments, company).reduce(
    (sum, p) => sum + p.companyShare,
    0,
  );

export const settledShare = (
  payments: AdminPaymentDto[],
  company: AdminCompanyDto,
): number =>
  settledPaymentsOf(payments, company).reduce(
    (sum, p) => sum + p.companyShare,
    0,
  );

export const paymentMethodsOf = (
  payments: AdminPaymentDto[],
  company: AdminCompanyDto,
): string[] => {
  const seen = new Set<string>();
  paymentsOf(payments, company).forEach((p) => {
    if (p.paymentMethod) seen.add(p.paymentMethod);
  });
  return Array.from(seen);
};

export interface Tenure {
  kind: "days" | "months" | "years";
  value: number;
}

/** Human partner tenure since registration (shown under the table's date). */
export const partnerTenure = (createdAt: string | undefined): Tenure | null => {
  if (!createdAt) return null;
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return null;
  const months = (Date.now() - start) / (30.44 * 86400000);
  if (months < 1) {
    const days = Math.max(0, Math.floor((Date.now() - start) / 86400000));
    return { kind: "days", value: days };
  }
  if (months < 12) return { kind: "months", value: Math.max(1, Math.round(months)) };
  return { kind: "years", value: Number((months / 12).toFixed(1)) };
};

/** Locale-aware relative label like "5 mins ago" (banner pending cards). */
export const timeAgo = (iso: string, lang: string): string => {
  const then = new Date(iso).getTime();
  const elapsed = Date.now() - then;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return rtf.format(-Math.max(1, Math.floor(elapsed / 1000)), "second");
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return rtf.format(-days, "day");
  return rtf.format(-Math.floor(days / 30), "month");
};

/** i18n key suffix for a real Moamalat/local payment method label. */
export const methodLabelKey = (method: string | undefined): string => {
  switch (method) {
    case "CASH_ON_DELIVERY":
      return "cash";
    case "MOAMALAT":
      return "moamalat";
    case "LOCAL_CARD":
      return "localCard";
    case "STRIPE":
      return "stripe";
    case "WALLET":
      return "wallet";
    default:
      return "unknownMethod";
  }
};