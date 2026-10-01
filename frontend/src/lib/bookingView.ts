import type {
  BookingCompanyRef,
  BookingDto,
  BookingVehicleRef,
} from "../types/booking";

export const UPCOMING_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "ACTIVE",
] as const;

export const TERMINATED_STATUSES = ["CANCELLED", "EXPIRED"] as const;

export const isUpcomingStatus = (status: BookingDto["bookingStatus"]): boolean =>
  (UPCOMING_STATUSES as readonly string[]).includes(status);

export const isTerminatedStatus = (
  status: BookingDto["bookingStatus"],
): boolean => (TERMINATED_STATUSES as readonly string[]).includes(status);

export const referenceCodeFrom = (id: string): string =>
  `NX-${id.slice(-6).toUpperCase()}`;

export const vehicleRefOf = (booking: BookingDto): BookingVehicleRef | null =>
  typeof booking.vehicleId === "object" ? booking.vehicleId : null;

export const providerOf = (booking: BookingDto): BookingCompanyRef | null =>
  typeof booking.companyId === "object" && booking.companyId?.name
    ? booking.companyId
    : null;

export const vehicleTitle = (booking: BookingDto): string => {
  const vehicle = vehicleRefOf(booking);
  const base = [vehicle?.make, vehicle?.model].filter(Boolean).join(" ");
  const name = base || "NexRide Vehicle";
  return vehicle?.year ? `${name} (${vehicle.year})` : name;
};

export const formatLYD = (amount: number): string =>
  amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatDate = (
  iso: string,
  lang: string,
  withTime = false,
): string => {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
};

export const rentalDays = (startIso: string, endIso: string): number =>
  Math.max(
    1,
    Math.round(
      (new Date(endIso).getTime() - new Date(startIso).getTime()) / 86400000,
    ),
  );

export const daysUntil = (iso: string): number =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

/** Triggers a browser download for a Blob (invoice PDFs, CSV exports). */
export const saveBlobAsFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};