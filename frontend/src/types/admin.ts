import type { BookingCompanyRef, BookingCustomerRef, BookingDto } from "./booking";
import type { VehicleDto } from "./vehicle";

/** Company document as returned by the admin /companies listing. */
export type CompanyStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";

/**
 * Account lifecycle status used by the platform operator for renter accounts.
 * Mirrors the User model enum (ACTIVE | SUSPENDED | BANNED).
 */
export type UserStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export interface AdminCustomerDto {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  photo?: string;
  role?: string;
  status?: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminCompanyDto {
  _id: string;
  ownerId?: string;
  name: string;
  subdomain?: string;
  slug?: string;
  description?: string;
  logo?: string;
  email?: string;
  phone?: string;
  city: string;
  address?: string;
  status: CompanyStatus;
  customCommissionRate?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Payment ledger record returned by the admin /commissions listing. The list
 * service does not populate references, so ids arrive as plain ObjectId strings
 * (unlike the single-record endpoint which populates). Keep the union so both
 * shapes type safely.
 */
export type PaymentLedgerStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type PayoutStatus = "UNSETTLED" | "PROCESSING" | "SETTLED";

export interface AdminPaymentDto {
  _id: string;
  bookingId?: string | { _id: string };
  customerId:
    | string
    | { _id: string; name?: string; email?: string; phoneNumber?: string }
    | null;
  companyId: string | BookingCompanyRef | null;
  amount: number;
  currency?: string;
  commissionAmount: number;
  commissionRate: number;
  companyShare: number;
  paymentMethod?: string;
  /** Gateway fields surfaced by the ledger service (nullable on the schema). */
  transactionId?: string | null;
  paymentGateway?: string;
  merchantReference?: string;
  status: PaymentLedgerStatus;
  payoutStatus: PayoutStatus;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** The raw datasets the admin Overview + Bookings pages render from. */
export interface AdminOverviewData {
  bookings: BookingDto[];
  vehicles: VehicleDto[];
  companies: AdminCompanyDto[];
  payments: AdminPaymentDto[];
}

// Re-export populated-ref helpers so admin views can pull object parts safely.
export type { BookingCompanyRef, BookingCustomerRef };