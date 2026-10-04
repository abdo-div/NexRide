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
  ReportPeriod,
  ReportsSummary,
  UserStatus,
} from "../types/admin";

// -----------------------------------------------------------------------------
// Response envelopes (mirror backend/routes/admin.routes.js)
// - bookings list reuses the shared factory envelope: data.data[]
// - vehicles / companies / commissions answer data.{collection}[]
// Each service runs APIFeatures (default sort -createdAt, bounded pagination).
// -----------------------------------------------------------------------------

interface AdminBookingsResponse {
  status: string;
  results: number;
  data: { data: BookingDto[] };
}

interface AdminVehiclesResponse {
  status: string;
  results: number;
  data: { vehicles: VehicleDto[] };
}

interface AdminCompaniesResponse {
  status: string;
  results: number;
  data: { companies: AdminCompanyDto[] };
}

interface AdminCommissionsResponse {
  status: string;
  results: number;
  data: { payments: AdminPaymentDto[] };
}

/**
 * Envelope returned by the shared user controller (userController.getAllUsers).
 * NOTE: this route passes req.query straight into User.find(), so only real
 * schema-field filters may be sent (e.g. role) — never limit/sort/page.
 */
interface AdminCustomersResponse {
  status: string;
  results: number;
  data: { users: AdminCustomerDto[] };
}

interface PayoutSummaryResponse {
  status: string;
  data: { summary: AdminPayoutSummary };
}

interface PayoutLedgerResponse {
  status: string;
  results: number;
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
  listBookings: (signal?: AbortSignal) =>
    request<AdminBookingsResponse>(`/admin/bookings?sort=-createdAt&limit=100`, {
      signal,
    }),

  listVehicles: (signal?: AbortSignal) =>
    request<AdminVehiclesResponse>(`/admin/vehicles?sort=-createdAt&limit=100`, {
      signal,
    }),

  listCompanies: (signal?: AbortSignal) =>
    request<AdminCompaniesResponse>(
      `/admin/companies?sort=-createdAt&limit=100`,
      { signal },
    ),

  listCommissions: (signal?: AbortSignal) =>
    request<AdminCommissionsResponse>(
      `/admin/commissions?sort=-createdAt&limit=100`,
      { signal },
    ),

  /**
   * Registered renter accounts (GET /api/v1/users?role=customer). No limit or
   * sort is passed: the user service feeds req.query directly to User.find().
   */
  listCustomers: (signal?: AbortSignal) =>
    request<AdminCustomersResponse>(`/users?role=customer`, { signal }),

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
   * Optional ?companyId=? narrows to a single partner dossier.
   */
  payoutLedger: (
    companyId?: string,
    signal?: AbortSignal,
  ): Promise<PayoutLedgerResponse> =>
    request<PayoutLedgerResponse>(
      `/admin/payouts/ledger${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ""}`,
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
   * OVERDUE) is computed server-side from estReturnDate.
   */
  listMaintenance: (
    signal?: AbortSignal,
  ): Promise<MaintenanceEventsResponse> =>
    request<MaintenanceEventsResponse>(
      `/admin/maintenance?sort=-createdAt&limit=100`,
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