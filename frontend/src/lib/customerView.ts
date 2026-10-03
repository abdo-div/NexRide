import { API_ORIGIN } from "./vehicleApi";
import type { AdminCustomerDto, AdminPaymentDto } from "../types/admin";
import type { BookingDto } from "../types/booking";
import { RESERVED_BOOKING_STATUSES } from "./companyView";

/**
 * Renter-account views. Customers come from GET /api/v1/users?role=customer
 * and carry no location/tier fields, so the UI derives everything else from the
 * real bookings and payment ledger — it never invents profile attributes.
 */

const customerIdOf = (
  value: string | { _id?: string } | null | undefined,
): string => {
  if (typeof value === "object" && value) return value._id ?? "";
  return (value ?? "") as string;
};

export const bookingsOfCustomer = (
  bookings: BookingDto[],
  customer: AdminCustomerDto,
): BookingDto[] =>
  bookings.filter((b) => customerIdOf(b.customerId) === customer._id);

/** Live reservations currently held by this renter (paid/confirmed/in-trip). */
export const activeBookingsOfCustomer = (
  bookings: BookingDto[],
  customer: AdminCustomerDto,
): BookingDto[] =>
  bookingsOfCustomer(bookings, customer).filter((b) =>
    (RESERVED_BOOKING_STATUSES as readonly string[]).includes(b.bookingStatus),
  );

export const completedBookingsOfCustomer = (
  bookings: BookingDto[],
  customer: AdminCustomerDto,
): BookingDto[] =>
  bookingsOfCustomer(bookings, customer).filter(
    (b) => b.bookingStatus === "COMPLETED",
  );

export const paymentsOfCustomer = (
  payments: AdminPaymentDto[],
  customer: AdminCustomerDto,
): AdminPaymentDto[] =>
  payments.filter((p) => customerIdOf(p.customerId) === customer._id);

export const completedPaymentsOfCustomer = (
  payments: AdminPaymentDto[],
  customer: AdminCustomerDto,
): AdminPaymentDto[] =>
  paymentsOfCustomer(payments, customer).filter((p) => p.status === "COMPLETED");

/** Lifetime invoiced spend from completed payments (LYD). */
export const spendOfCustomer = (
  payments: AdminPaymentDto[],
  customer: AdminCustomerDto,
): number =>
  completedPaymentsOfCustomer(payments, customer).reduce(
    (sum, p) => sum + p.amount,
    0,
  );

/** Most recent booking on record (by start date, then creation). */
export const latestBookingOfCustomer = (
  bookings: BookingDto[],
  customer: AdminCustomerDto,
): BookingDto | null => {
  const list = bookingsOfCustomer(bookings, customer);
  if (list.length === 0) return null;
  return list.slice().sort((a, b) => {
    const cmp =
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    if (cmp !== 0) return cmp;
    return (
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    );
  })[0];
};

/** Distinct checkout channels used by this renter across their payments. */
export const customerChannels = (
  payments: AdminPaymentDto[],
  customer: AdminCustomerDto,
): string[] => {
  const seen = new Set<string>();
  paymentsOfCustomer(payments, customer).forEach((p) => {
    if (p.paymentMethod) seen.add(p.paymentMethod);
  });
  return Array.from(seen);
};

/**
 * Avatar for a renter: uploaded photos (user-*.jpeg under /public/users) are
 * served from the API origin; the seeded "default.jpg" placeholder is never
 * shown, so the initials tile is used instead. Returns "" when there is no
 * real uploaded photo.
 */
export const userPhotoUrl = (photo: string | undefined): string => {
  if (!photo) return "";
  if (/^https?:\/\//i.test(photo)) return photo;
  const normalizedPath = photo.replace(/^\/+/, "");
  if (/^(users|avatars)\//i.test(normalizedPath)) {
    return `${API_ORIGIN}/${normalizedPath}`;
  }
  if (normalizedPath.startsWith("user-")) {
    return `${API_ORIGIN}/users/${encodeURIComponent(normalizedPath)}`;
  }
  return "";
};