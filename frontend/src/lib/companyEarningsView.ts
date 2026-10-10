import { formatLYD, rentalDays } from "./bookingView";
import type {
  PayoutStatus,
  PaymentStatus,
} from "../types/companyEarnings";

/**
 * Derived display status for a payout ledger row. The register ships the raw
 * Payment lifecycle + payout rail states; this maps them to the design's chip
 * vocabulary (Disbursed / Processing / Completed / Refunded) so the component
 * never has to second-guess server truth.
 */
export const viewStatusOf = (
  status: PaymentStatus,
  payoutStatus: PayoutStatus,
): "refunded" | "partiallyRefunded" | "disbursed" | "processing" | "completed" => {
  if (status === "REFUNDED") return "refunded";
  if (status === "PARTIALLY_REFUNDED") return "partiallyRefunded";
  if (status === "COMPLETED") {
    if (payoutStatus === "SETTLED") return "disbursed";
    if (payoutStatus === "PROCESSING") return "processing";
  }
  return "completed";
};

export const moneyOf = (value: number): string => `${formatLYD(value)} LYD`;

export const vehicleLineOf = (
  vehicle: { make: string; model: string; year: number | null } | null,
): string => {
  if (!vehicle) return "";
  const base = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return vehicle.year ? `${base} (${vehicle.year})` : base;
};

export const rentalDaysOf = (
  startIso: string | null,
  endIso: string | null,
): number | null =>
  startIso && endIso ? rentalDays(startIso, endIso) : null;

export const formatDateTime = (iso: string, lang: string): string =>
  new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

export const formatDate = (iso: string, lang: string): string =>
  new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));