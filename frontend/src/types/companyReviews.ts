import type { PaginationMeta } from "./admin";

/** The tenant whose reviews & ratings workspace this is (from the session). */
export interface CompanyReviewsCompany {
  name: string;
  slug: string;
}

/** KPI deck recomputed from the tenant's own Review documents. */
export interface CompanyReviewSummary {
  total: number;
  avg: number | null;
  verified: number;
  vehicles: number;
  thisMonth: number;
  previousMonth: number;
  monthChangePct: number | null;
  avgDelta: number | null;
  responded: number;
  awaiting: number;
  responseRatePct: number | null;
  avgResponseHours: number | null;
}

export interface CompanyReviewDistributionDatum {
  stars: number;
  count: number;
  percent: number;
}

export interface CompanyReviewTrendDatum {
  key: string;
  year: number;
  month: number;
  count: number;
  avg: number | null;
}

export interface CompanyReviewVehicleRef {
  id: string;
  make: string;
  model: string;
  year: number | null;
  photo: string | null;
}

export interface CompanyReviewLeaderboardRow {
  rank: number;
  vehicle: CompanyReviewVehicleRef;
  count: number;
  avg: number | null;
  positivePct: number;
}

export interface CompanyReviewCustomerRef {
  id: string | null;
  initials: string;
  name: string;
  photo: string | null;
}

export interface CompanyReviewBookingRef {
  reference: string | null;
  pickupLocation: string | null;
  totalDays: number | null;
  pickupMethod: "BRANCH_PICKUP" | "DELIVERY" | null;
}

export interface CompanyReviewResponse {
  responded: boolean;
  text: string | null;
  respondedAt: string | null;
}

/** One row of the "All Ratings" register. */
export interface CompanyReviewRow {
  id: string;
  rating: number;
  review: string;
  createdAt: string | null;
  customer: CompanyReviewCustomerRef;
  vehicle: CompanyReviewVehicleRef | null;
  booking: CompanyReviewBookingRef | null;
  companyResponse: CompanyReviewResponse;
}

/** Full payload of GET /companies/reviews. */
export interface CompanyReviewsData {
  company: CompanyReviewsCompany | null;
  summary: CompanyReviewSummary;
  distribution: CompanyReviewDistributionDatum[];
  trend: CompanyReviewTrendDatum[];
  leaderboard: CompanyReviewLeaderboardRow[];
  vehicles: CompanyReviewVehicleRef[];
  list: CompanyReviewRow[];
  pagination: PaginationMeta;
}

export type CompanyReviewStatusFilter = "all" | "responded" | "awaiting";

export type CompanyReviewPeriodFilter = "all" | "30d" | "90d" | "year";

/** Client-side filter state that maps to the backend query string (deck is always the full tenant set). */
export interface CompanyReviewsQuery {
  star: number | "all";
  vehicleId: string;
  status: CompanyReviewStatusFilter;
  period: CompanyReviewPeriodFilter;
  page: number;
  limit: number;
}