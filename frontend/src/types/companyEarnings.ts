import type { PaginationMeta } from "./admin";

/** Date-range codes shared with the backend deck (register + new KPIs). */
export type EarningsRangeFilter =
  | "all"
  | "today"
  | "7d"
  | "30d"
  | "thisMonth"
  | "lastMonth"
  | "3m"
  | "year";

/** Independent tab on the revenue chart. */
export type EarningsChartRange = "7d" | "30d" | "3m" | "12m";

/** Register status chips. "completed" is captured but not yet disbursed. */
export type EarningsStatusFilter =
  | "all"
  | "completed"
  | "paid"
  | "escrow"
  | "refunded";

/** Register payment-channel chips (real stored payment methods). */
export type EarningsMethodFilter = "all" | "cash" | "card" | "moamalat" | "wallet";

export type PaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type PayoutStatus = "UNSETTLED" | "PROCESSING" | "SETTLED";

export type PaymentMethod =
  | "CASH_ON_DELIVERY"
  | "LOCAL_CARD"
  | "MOAMALAT"
  | "WALLET";

export interface CompanyEarningsCompany {
  name: string;
  slug: string;
  commissionRate: number;
}

export interface CompanyEarningsSettings {
  payoutSchedule: string;
  clearingBank: string;
}

export interface CompanyEarningsRange {
  code: EarningsRangeFilter;
  from: string | null;
  to: string | null;
}

/** KPI deck recomputed from the tenant's own Payment documents. */
export interface CompanyEarningsSummary {
  gross: number;
  bookings: number;
  platformTake: number;
  companyEarnings: number;
  effectiveRate: number;
  grossDeltaPct: number | null;
  available: number;
  inEscrow: number;
  disbursed: number;
}

export interface CompanyEarningsChartBucket {
  key: string;
  label: string;
  dateFrom: number;
  dateTo: number;
  gross: number;
  fee: number;
  net: number;
  tx: number;
}

export interface CompanyEarningsChart {
  range: EarningsChartRange;
  buckets: CompanyEarningsChartBucket[];
  avgTakePerDay: number;
  topWindow: { label: string; gross: number } | null;
}

export interface CompanyEarningsVehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  type: string | null;
  photo: string | null;
}

export interface CompanyTopVehicleRow {
  rank: number;
  vehicle: CompanyEarningsVehicle;
  gross: number;
  bookings: number;
  sharePct: number;
}

export interface CompanyEarningsMixRow {
  type: string;
  gross: number;
  pct: number;
}

export interface CompanyEarningsCustomer {
  id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  photo: string | null;
}

export interface CompanyEarningsBooking {
  id: string;
  reference: string;
  pickupLocation: string | null;
  pickupMethod: "BRANCH_PICKUP" | "DELIVERY" | null;
  startDate: string | null;
  endDate: string | null;
  dailyRate: number;
  totalDays: number | null;
  rentalPrice: number;
  discountAmount: number;
  commissionRate: number | null;
}

/** One row of the payout ledger register. */
export interface CompanyEarningsRow {
  id: string;
  trxRef: string;
  amount: number;
  commissionAmount: number;
  commissionRate: number;
  companyShare: number;
  refundAmount: number;
  paymentMethod: PaymentMethod;
  merchantReference: string | null;
  transactionId: string | null;
  status: PaymentStatus;
  payoutStatus: PayoutStatus;
  paidAt: string | null;
  createdAt: string | null;
  customer: CompanyEarningsCustomer;
  booking: CompanyEarningsBooking | null;
  vehicle: CompanyEarningsVehicle | null;
}

/** Full payload of GET /payments/tenant/earnings. */
export interface CompanyEarningsData {
  company: CompanyEarningsCompany | null;
  range: CompanyEarningsRange;
  settings: CompanyEarningsSettings;
  summary: CompanyEarningsSummary;
  chart: CompanyEarningsChart;
  topVehicles: CompanyTopVehicleRow[];
  mix: CompanyEarningsMixRow[];
  vehicles: CompanyEarningsVehicle[];
  list: CompanyEarningsRow[];
  pagination: PaginationMeta;
}

/** Client-side filter state mapped to the backend query string. */
export interface CompanyEarningsQuery {
  range: EarningsRangeFilter;
  chartRange: EarningsChartRange;
  search: string;
  status: EarningsStatusFilter;
  vehicleId: string;
  method: EarningsMethodFilter;
  page: number;
  limit: number;
}