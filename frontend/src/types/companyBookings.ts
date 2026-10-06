import type { BookingStatus } from "./booking";
import type { PaginationMeta } from "./admin";

/** Toolbar tabs / views. `ALL` is the default register; the others scope it. */
export type CompanyBookingsView = "ALL" | "UPCOMING" | "HANDOVER";

/** Display-status groups the Status dropdown and tab counters share. */
export type CompanyBookingsStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

export type CompanyPaymentState = "PAID" | "PENDING" | "FAILED" | "REFUNDED";

/** Order-channel label, derived from the real booking/ledger data. */
export type CompanyBookingChannel =
  | "delivery"
  | "moamalat"
  | "card"
  | "wallet"
  | "cash"
  | "branch";

export interface CompanyBookingsCompany {
  id: string;
  name: string;
  code: string;
}

/** Headline card + tab counters for the tenant's booking ledger. */
export interface CompanyBookingsSummary {
  total: number;
  pending: number;
  confirmed: number;
  active: number;
  completed: number;
  cancelled: number;
  upcoming: number;
  handover: number;
}

export interface CompanyVehicleOption {
  id: string;
  make: string;
  model: string;
  year: number | null;
}

export interface CompanyBookingRowCustomer {
  initials: string;
  name: string;
  phone: string | null;
}

export interface CompanyBookingRowVehicle {
  photo: string | null;
  make: string;
  model: string;
  year: number | null;
  hub: string | null;
}

export type CompanyHandoverCheckKey = "gps" | "ready" | "paid" | "signed";

export interface CompanyHandoverCheck {
  key: CompanyHandoverCheckKey;
  done: boolean;
}

/** Everything the Quick Inspect drawer needs for one booking. */
export interface CompanyBookingDetail {
  title: string;
  photo: string | null;
  vehicleType: string | null;
  vehicleHub: string | null;
  customerName: string;
  customerPhone: string | null;
  pickupLocation: string;
  pickupMethod: "BRANCH_PICKUP" | "DELIVERY";
  dailyRate: number;
  totalDays: number;
  totalAmount: number;
  companyShare: number;
  resolvedPayment: CompanyPaymentState;
  payoutStatus: string | null;
  checks: CompanyHandoverCheck[];
}

/** One row of the bookings & dispatches register. */
export interface CompanyBookingRow {
  id: string;
  reference: string;
  channel: CompanyBookingChannel;
  verified: boolean;
  customer: CompanyBookingRowCustomer;
  vehicle: CompanyBookingRowVehicle;
  startDate: string;
  endDate: string;
  days: number;
  totalAmount: number;
  companyShare: number;
  payment: CompanyPaymentState;
  bookingStatus: BookingStatus;
  detail: CompanyBookingDetail;
}

/** Full payload of GET /companies/bookings. */
export interface CompanyBookingsData {
  period: { from: string | null; to: string | null };
  company: CompanyBookingsCompany | null;
  summary: CompanyBookingsSummary;
  vehicles: CompanyVehicleOption[];
  list: CompanyBookingRow[];
  pagination: PaginationMeta;
}

/** Client-side filter state that maps to the backend query string. */
export interface CompanyBookingsQuery {
  view: CompanyBookingsView;
  search: string;
  status: CompanyBookingsStatus | "ALL";
  payment: CompanyPaymentState | "ALL";
  vehicleId: string;
  fromDate: string;
  page: number;
  limit: number;
}