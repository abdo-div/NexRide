import { request } from "./apiClient";
import type {
  CompanyDashboardData,
  CompanyDashboardPeriod,
} from "../types/companyDashboard";

interface CompanyDashboardResponse {
  status: string;
  data: CompanyDashboardData;
}

/**
 * Tenant-scoped operations dashboard (GET /companies/dashboard). For a company
 * session the tenant comes from the JWT — the backend ignores any forged
 * `companyId` query key — so no cross-tenant aggregation can leak through here.
 */
export const companyDashboardApi = {
  summary: (period: CompanyDashboardPeriod, signal?: AbortSignal) =>
    request<CompanyDashboardResponse>(
      `/companies/dashboard?period=${encodeURIComponent(period)}`,
      { signal },
    ),
};