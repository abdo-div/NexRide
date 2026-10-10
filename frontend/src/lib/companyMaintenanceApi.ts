import { request } from "./apiClient";
import type { PaginationMeta } from "../types/admin";
import type {
  CreateMaintenancePayload,
  MaintenanceEventDto,
  MaintenanceSummary,
} from "../types/admin";
import type { CompanyMaintenanceQuery } from "../types/companyMaintenance";

interface CompanyMaintenanceListResponse {
  status: string;
  results: number;
  pagination: PaginationMeta;
  data: { events: MaintenanceEventDto[] };
}

interface CompanyMaintenanceSummaryResponse {
  status: string;
  data: { summary: MaintenanceSummary };
}

interface CompanyMaintenanceEventResponse {
  status: string;
  data: { event: MaintenanceEventDto };
}

interface CompanyMaintenanceReleaseResponse {
  status: string;
  data: { released: number; vehicle: unknown };
}

const buildQuery = (query: CompanyMaintenanceQuery): string => {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  if (query.search.trim()) params.set("search", query.search.trim());
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.category !== "ALL") params.set("category", query.category);
  return params.toString();
};

/**
 * Tenant-scoped maintenance surface (GET/POST/PATCH /companies/maintenance).
 * For a company session the tenant always comes from the JWT, so a forged
 * `companyId` query key can never pivot the ledger onto another fleet.
 */
export const companyMaintenanceApi = {
  list: (query: CompanyMaintenanceQuery, signal?: AbortSignal) =>
    request<CompanyMaintenanceListResponse>(
      `/companies/maintenance?${buildQuery(query)}`,
      { signal },
    ),

  summary: (signal?: AbortSignal) =>
    request<CompanyMaintenanceSummaryResponse>(`/companies/maintenance/summary`, {
      signal,
    }),

  create: (payload: CreateMaintenancePayload, signal?: AbortSignal) =>
    request<CompanyMaintenanceEventResponse>(`/companies/maintenance`, {
      method: "POST",
      body: payload,
      signal,
    }),

  complete: (id: string, signal?: AbortSignal) =>
    request<CompanyMaintenanceEventResponse>(`/companies/maintenance/${id}/complete`, {
      method: "PATCH",
      signal,
    }),

  release: (vehicleId: string, signal?: AbortSignal) =>
    request<CompanyMaintenanceReleaseResponse>(
      `/companies/maintenance/${vehicleId}/release`,
      { method: "POST", signal },
    ),
};