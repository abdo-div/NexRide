import type { BookingDto } from "./booking";

/** Supported rolling window for the company dashboard aggregation. */
export type CompanyDashboardPeriod = "7d" | "30d" | "3m" | "12m";

export interface CompanyDashboardPeriodWindow {
  from: string;
  to: string;
  label: CompanyDashboardPeriod;
}

/** Company profile embedded in the dashboard response (session tenant). */
export interface CompanyDashboardCompany {
  id: string;
  name: string;
  city?: string;
  status?: string;
  approvedAt?: string | null;
  commissionRate?: number | null;
}

/** The four headline card figures, aggregated live from the tenant ledgers. */
export interface CompanyDashboardKpis {
  totalVehicles: number;
  totalPublished: number;
  onRoad: number;
  upcoming: number;
  pendingPayout: number;
  pendingPayoutCount: number;
  revenueGross: number;
  revenueNet: number;
  revenueDeltaPct: number | null;
}

/** One bucket of the revenue series (gross vs net company earnings). */
export interface CompanyRevenuePoint {
  label: string;
  gross: number;
  net: number;
  tx: number;
}

/** Rolling financial surface for the requested period. */
export interface CompanyFinancial {
  gross: number;
  cut: number;
  net: number;
  tx: number;
  avgTicket: number;
  takeRatePct: number;
  avgDailyEarning: number;
  periodDays: number;
}

/** Fleet posture derived from the tenant's vehicle registry + bookings. */
export interface CompanyFleet {
  total: number;
  available: number;
  onRoad: number;
  maintenance: number;
  scheduled: number;
  published: number;
  utilizationPct: number;
}

/** An upcoming booking/dispatch row (soonest first, capped server-side). */
export interface CompanyUpcomingBooking {
  id: string;
  reference: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number | null;
  photo: string | null;
  customerName: string;
  pickupLocation?: string;
  pickupMethod?: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  companyShare: number;
  bookingStatus: BookingDto["bookingStatus"];
}

export type CompanyActivityKind = "payment" | "booking" | "vehicle";

/** One entry of the real-time activity timeline. */
export interface CompanyActivityItem {
  id: string;
  kind: CompanyActivityKind;
  title: string;
  detail: string;
  meta: string | number;
  at: string;
}

/** Operational performance KPIs for the current calendar month. */
export interface CompanyPerformance {
  bookingsThisMonth: number;
  bookingsPrevMonth: number;
  bookingsDeltaPct: number | null;
  fulfillmentRate: number;
  cancellationRate: number;
  avgBookingValue: number;
  completedCount: number;
  avgRating: number;
  reviews: number;
}

/** Full payload of GET /companies/dashboard. */
export interface CompanyDashboardData {
  period: CompanyDashboardPeriodWindow;
  company: CompanyDashboardCompany | null;
  kpis: CompanyDashboardKpis;
  revenueSeries: CompanyRevenuePoint[];
  financial: CompanyFinancial;
  fleet: CompanyFleet;
  upcomingBookings: CompanyUpcomingBooking[];
  activity: CompanyActivityItem[];
  performance: CompanyPerformance;
}