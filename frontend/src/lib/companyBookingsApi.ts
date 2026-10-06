import { request } from "./apiClient";
import type { CompanyBookingsData, CompanyBookingsQuery } from "../types/companyBookings";

interface CompanyBookingsResponse {
  status: string;
  data: CompanyBookingsData;
}

const buildQuery = (query: CompanyBookingsQuery): string => {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  if (query.view !== "ALL") params.set("view", query.view);
  if (query.search.trim()) params.set("search", query.search.trim());
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.payment !== "ALL") params.set("payment", query.payment);
  if (query.vehicleId) params.set("vehicleId", query.vehicleId);
  if (query.fromDate) params.set("fromDate", query.fromDate);
  return params.toString();
};

/**
 * Tenant-scoped bookings & dispatches register (GET /companies/bookings). For a
 * company session the tenant comes from the JWT — the backend ignores any
 * forged `companyId` query key — so no cross-tenant ledger can leak through.
 */
export const companyBookingsApi = {
  list: (query: CompanyBookingsQuery, signal?: AbortSignal) =>
    request<CompanyBookingsResponse>(`/companies/bookings?${buildQuery(query)}`, {
      signal,
    }),
};