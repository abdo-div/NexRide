import type {
  AdminCompanyDto,
  AdminCustomerDto,
  AdminPaymentDto,
} from "../types/admin";
import type { BookingDto } from "../types/booking";
import { referenceCodeFrom } from "./bookingView";

/**
 * Payment-ledger views. Records come from GET /api/v1/admin/commissions and
 * carry unpopulated refs (plain ObjectId strings), so the UI joins them
 * against the real customers / companies / bookings lists. Nothing is invented:
 * every displayed figure comes from the ledger fields.
 */

const asId = (value: unknown): string =>
  typeof value === "object" && value
    ? (value as { _id?: string })._id ?? ""
    : ((value ?? "") as string);

/** Display reference derived from the real ledger record id (e.g. #TRX-AB12CD). */
export const trxRefOf = (payment: AdminPaymentDto): string =>
  `#TRX-${payment._id.slice(-6).toUpperCase()}`;

export const customerOfPayment = (
  customers: AdminCustomerDto[],
  payment: AdminPaymentDto,
): AdminCustomerDto | undefined =>
  customers.find((c) => c._id === asId(payment.customerId));

export const companyOfPayment = (
  companies: AdminCompanyDto[],
  payment: AdminPaymentDto,
): AdminCompanyDto | undefined =>
  companies.find((c) => c._id === asId(payment.companyId));

export const bookingOfPayment = (
  bookings: BookingDto[],
  payment: AdminPaymentDto,
): BookingDto | undefined =>
  bookings.find((b) => b._id === asId(payment.bookingId));

/** Effective event timestamp: paidAt when settled, otherwise creation time. */
export const paymentTimestamp = (
  payment: AdminPaymentDto,
): string | undefined => payment.paidAt ?? payment.createdAt;

/** Distinct real gateway/provider values present in the ledger. */
export const paymentMethodsOf = (payments: AdminPaymentDto[]): string[] => {
  const seen = new Set<string>();
  payments.forEach((p) => {
    if (p.paymentMethod) seen.add(p.paymentMethod);
  });
  return Array.from(seen);
};

/** Text the ledger search input scans (real fields + display refs). */
export const paymentSearchText = (
  payment: AdminPaymentDto,
  bookings: BookingDto[],
  customers: AdminCustomerDto[],
  companies: AdminCompanyDto[],
): string => {
  const customer = customerOfPayment(customers, payment);
  const company = companyOfPayment(companies, payment);
  const booking = bookingOfPayment(bookings, payment);
  return [
    trxRefOf(payment),
    payment.merchantReference ?? "",
    payment.transactionId ?? "",
    referenceCodeFrom(booking?._id ?? ""),
    customer?.name ?? "",
    customer?.email ?? "",
    customer?.phoneNumber ?? "",
    company?.name ?? "",
    payment.paymentMethod ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase();
};