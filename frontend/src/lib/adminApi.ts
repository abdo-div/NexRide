import { request } from "./apiClient";
import type { BookingDto } from "../types/booking";
import type { VehicleDto } from "../types/vehicle";
import type {
  AdminCompanyDto,
  AdminCustomerDto,
  AdminPaymentDto,
  AdminPayoutRow,
  AdminPayoutSummary,
  CompanyStatus,
  CreateMaintenancePayload,
  MaintenanceEventDto,
  MaintenanceSummary,
  PayoutBatch,
  PayoutSettleResult,
  PlatformSettingsPatch,
  PlatformSettingsResponseData,
  PaginationMeta,
  ReportPeriod,
  ReportsSummary,
  UserStatus,
} from "../types/admin";

// -----------------------------------------------------------------------------
// Response envelopes (mirror backend/controllers/*.js)
// - bookings list reuses the shared factory envelope: data.data[]
// - vehicles / companies / commissions answer data.{collection}[]
// Every listing also answers a top-level `pagination` block produced by the
// backend's shared resolver, so the tables page through the real result set
// instead of slicing an arbitrarily capped first page in the browser.
// -----------------------------------------------------------------------------

/**
 * Query parameters shared by every paginated admin listing. Only keys the
 * endpoint actually understands are forwarded, so the server stays the single
 * source of truth for filtering.
 */
export interface AdminListParams {
  page?: number;
  limit?: number;
  sort?: string;
  /** Free-text search; each endpoint maps it onto an allowlisted field set. */
  search?: string;
  /** Booking status filter (GET /admin/bookings). */
  bookingStatus?: string;
  companyId?: string;
  /** Company city scope (GET /admin/companies). */
  city?: string;
  /** Vehicle operational status (GET /admin/vehicles). */
  operationalStatus?: string;
  /** Vehicle class/body type (GET /admin/vehicles). */
  type?: string;
  category?: string;
  priority?: string;
  status?: string;
  hub?: string;
  /** Account role scope; the customers register is locked to `customer`. */
  role?: string;
}

const listQuery = (params: AdminListParams = {}): string => {
  const query = new URLSearchParams();

  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.sort) query.set("sort", params.sort);
  if (params.search) query.set("search", params.search);
  if (params.bookingStatus && params.bookingStatus !== "ALL") {
    query.set("bookingStatus", params.bookingStatus);
  }
  if (params.companyId && params.companyId !== "ALL") {
    query.set("companyId", params.companyId);
  }
  if (params.city && params.city !== "ALL") query.set("city", params.city);
  if (params.operationalStatus && params.operationalStatus !== "ALL") {
    query.set("operationalStatus", params.operationalStatus);
  }
  if (params.type && params.type !== "ALL") query.set("type", params.type);
  if (params.category && params.category !== "ALL") {
    query.set("category", params.category);
  }
  if (params.priority && params.priority !== "ALL") {
    query.set("priority", params.priority);
  }
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  if (params.hub && params.hub !== "ALL") query.set("hub", params.hub);
  if (params.role) query.set("role", params.role);

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

/**
 * Window used for the *reference* registries the admin pages keep in memory to
 * resolve foreign keys (company/vehicle/customer names) and derive KPIs.
 *
 * These are deliberately NOT the primary table source: every admin listing table
 * pages through its own endpoint via `usePaginatedList`. This bounded window
 * only exists so a page can label a row or fill a filter dropdown, which is why
 * it asks for the largest page the routes allow instead of a single row.
 */
export const REGISTRY_LIMIT = 100;

interface AdminBookingsResponse {
  status: string;
  results: number;
  pagination: PaginationMeta;
  data: { data: BookingDto[] };
}

interface AdminVehiclesResponse {
  status: string;
  results: number;
  pagination: PaginationMeta;
  data: { vehicles: VehicleDto[] };
}

interface AdminCompaniesResponse {
  status: string;
  results: number;
  pagination: PaginationMeta;
  data: { companies: AdminCompanyDto[] };
}

interface AdminCommissionsResponse {
  status: string;
  results: number;
  pagination: PaginationMeta;
  data: { payments: AdminPaymentDto[] };
}

/**
 * Envelope returned by the shared user controller (userController.getAllUsers).
 * The user service now applies APIFeatures, so page/limit/sort/search and real
 * schema-field filters may be sent alongside the mandatory `role` scope.
 */
interface AdminCustomersResponse {
  status: string;
  results: number;
  pagination: PaginationMeta;
  data: { users: AdminCustomerDto[] };
}

interface PayoutSummaryResponse {
  status: string;
  data: { summary: AdminPayoutSummary };
}

interface PayoutLedgerResponse {
  status: string;
  results: number;
  pagination: PaginationMeta;
  data: { ledger: AdminPayoutRow[] };
}

interface PayoutBatchResponse {
  status: string;
  data: { batch: PayoutBatch };
}

interface PayoutSettleResponse {
  status: string;
  data: PayoutSettleResult;
}

interface MaintenanceSummaryResponse {
  status: string;
  data: { summary: MaintenanceSummary };
}

interface MaintenanceEventsResponse {
  status: string;
  results: number;
  pagination: PaginationMeta;
  data: { events: MaintenanceEventDto[] };
}

interface MaintenanceEventResponse {
  status: string;
  data: { event: MaintenanceEventDto };
}

interface MaintenanceReleaseResponse {
  status: string;
  data: { released: number; vehicle: VehicleDto };
}

interface ReportsSummaryResponse {
  status: string;
  data: { summary: ReportsSummary };
}

interface PlatformSettingsResponse {
  status: string;
  data: PlatformSettingsResponseData;
}

/** The platform admin endpoints are JWT-gated (protect + restrictTo("admin")). */
export const adminApi = {
  listBookings: (params: AdminListParams = {}, signal?: AbortSignal) =>
    request<AdminBookingsResponse>(
      `/admin/bookings${listQuery({ sort: "-createdAt", ...params })}`,
      { signal },
    ),

  listVehicles: (params: AdminListParams = {}, signal?: AbortSignal) =>
    request<AdminVehiclesResponse>(
      `/admin/vehicles${listQuery({ sort: "-createdAt", ...params })}`,
      { signal },
    ),

  listCompanies: (params: AdminListParams = {}, signal?: AbortSignal) =>
    request<AdminCompaniesResponse>(
      `/admin/companies${listQuery({ sort: "-createdAt", ...params })}`,
      { signal },
    ),

  listCommissions: (params: AdminListParams = {}, signal?: AbortSignal) =>
    request<AdminCommissionsResponse>(
      `/admin/commissions${listQuery({ sort: "-createdAt", ...params })}`,
      { signal },
    ),

  /** Registered renter accounts (GET /api/v1/users?role=customer). */
  listCustomers: (params: AdminListParams = {}, signal?: AbortSignal) =>
    request<AdminCustomersResponse>(
      `/users${listQuery({ role: "customer", sort: "-createdAt", ...params })}`,
      { signal },
    ),

  /** Platform operator status transition for a renter account. */
  updateUserStatus: (
    id: string,
    status: UserStatus,
    signal?: AbortSignal,
  ) =>
    request<{ status: string; data: { user: AdminCustomerDto } }>(
      `/users/${id}/status`,
      { method: "PATCH", body: { status }, signal },
    ),

  /** Platform operator status transition (PENDING -> APPROVED/SUSPENDED/REJECTED). */
  updateCompanyStatus: (
    id: string,
    status: CompanyStatus,
    signal?: AbortSignal,
  ) =>
    request<{ status: string; data: { company: AdminCompanyDto } }>(
      `/admin/companies/${id}/status`,
      { method: "PATCH", body: { status }, signal },
    ),

  /**
   * Platform-wide commission & settlement KPIs (aggregation pipeline). The
   * numbers are live sums over the real Payment ledger.
   */
  payoutSummary: (signal?: AbortSignal): Promise<PayoutSummaryResponse> =>
    request<PayoutSummaryResponse>(`/admin/payouts/summary`, { signal }),

  /**
   * Clearing ledger — one aggregated settlement run per fleet operator.
   * Optional companyId/search narrow the page server-side; the response carries
   * pagination metadata because the ledger is a full aggregation, not a slice.
   */
  payoutLedger: (
    params: AdminListParams = {},
    signal?: AbortSignal,
  ): Promise<PayoutLedgerResponse> =>
    request<PayoutLedgerResponse>(
      `/admin/payouts/ledger${listQuery(params)}`,
      { signal },
    ),

  /**
   * Generate the LFB payout-run batch: marks all unsettled COMPLETED payments
   * (optionally for a set of operators) as PROCESSING.
   */
  dispatchPayoutBatch: (
    companyIds?: string[],
    signal?: AbortSignal,
  ): Promise<PayoutBatchResponse> =>
    request<PayoutBatchResponse>(`/admin/payouts/dispatch`, {
      method: "POST",
      body: companyIds && companyIds.length > 0 ? { companyIds } : {},
      signal,
    }),

  /** Approve & dispatch a fleet operator's payout queue (settles it). */
  settlePayoutBatch: (
    companyId?: string,
    signal?: AbortSignal,
  ): Promise<PayoutSettleResponse> =>
    request<PayoutSettleResponse>(`/admin/payouts/settle`, {
      method: "POST",
      body: companyId ? { companyId } : {},
      signal,
    }),

  /**
   * Fleet Health overview. Vehicles in service, scheduled/overdue work,
   * quarantined units and MTD spend — all computed live from the real
   * Vehicle registry + the MaintenanceEvent ledger.
   */
  maintenanceSummary: (
    signal?: AbortSignal,
  ): Promise<MaintenanceSummaryResponse> =>
    request<MaintenanceSummaryResponse>(`/admin/maintenance/summary`, {
      signal,
    }),

  /**
   * Maintenance-event ledger, newest first. dispatchStatus (incl. derived
   * OVERDUE) is computed server-side from estReturnDate, and the OVERDUE/hub
   * scopes are real Mongo filters — so the page and its total always agree.
   */
  listMaintenance: (
    params: AdminListParams = {},
    signal?: AbortSignal,
  ): Promise<MaintenanceEventsResponse> =>
    request<MaintenanceEventsResponse>(
      `/admin/maintenance${listQuery({ sort: "-createdAt", ...params })}`,
      { signal },
    ),

  /** "+ Log Maintenance Event" — the create action that locks the unit out. */
  createMaintenanceEvent: (
    payload: CreateMaintenancePayload,
    signal?: AbortSignal,
  ): Promise<MaintenanceEventResponse> =>
    request<MaintenanceEventResponse>(`/admin/maintenance`, {
      method: "POST",
      body: payload,
      signal,
    }),

  /** Marks a single event complete and returns its unit to AVAILABLE. */
  completeMaintenanceEvent: (
    id: string,
    signal?: AbortSignal,
  ): Promise<MaintenanceEventResponse> =>
    request<MaintenanceEventResponse>(`/admin/maintenance/${id}/complete`, {
      method: "PATCH",
      signal,
    }),

  /** Admin clearance: releases all open events for a unit + re-enables fleet. */
  releaseMaintenanceVehicle: (
    vehicleId: string,
    signal?: AbortSignal,
  ): Promise<MaintenanceReleaseResponse> =>
    request<MaintenanceReleaseResponse>(
      `/admin/maintenance/${vehicleId}/release`,
      { method: "POST", signal },
    ),

  /**
   * Reports & Analytics executive summary. Every figure is aggregated
   * server-side for the requested window (`period`) and optional hub scope, so
   * the KPI deck, charts and rankings are all grounded in real ledger data.
   */
  analyticsSummary: (
    period: ReportPeriod,
    hub: string,
    signal?: AbortSignal,
  ): Promise<ReportsSummaryResponse> =>
    request<ReportsSummaryResponse>(
      `/admin/reports/summary?period=${encodeURIComponent(period)}${
        hub ? `&hub=${encodeURIComponent(hub)}` : ""
      }`,
      { signal },
    ),

  /**
   * Platform Settings & Governance registry. GET returns the persisted config
   * plus a live governance snapshot (fleet, partners, payment ledger, admins,
   * Moamalat environment and current session).
   */
  platformSettings: (
    signal?: AbortSignal,
  ): Promise<PlatformSettingsResponse> =>
    request<PlatformSettingsResponse>(`/admin/settings`, { signal }),

  /** Persist partial settings sections (or reset with { reset: true }). */
  updatePlatformSettings: (
    patch: PlatformSettingsPatch,
    signal?: AbortSignal,
  ): Promise<PlatformSettingsResponse> =>
    request<PlatformSettingsResponse>(`/admin/settings`, {
      method: "PATCH",
      body: patch,
      signal,
    }),
};