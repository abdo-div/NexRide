import { request } from "./apiClient";
import type { CompanyFleetData, CompanyFleetQuery } from "../types/companyFleet";

interface CompanyFleetResponse {
  status: string;
  data: CompanyFleetData;
}

const buildQuery = (query: CompanyFleetQuery): string => {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  if (query.search.trim()) params.set("search", query.search.trim());
  if (query.status !== "all") params.set("status", query.status);
  if (query.category !== "all") params.set("category", query.category);
  if (query.transmission !== "all") params.set("transmission", query.transmission);
  if (query.fuel !== "all") params.set("fuel", query.fuel);
  if (query.city.trim()) params.set("city", query.city.trim());
  return params.toString();
};

/**
 * Tenant-scoped fleet register (GET /companies/fleet). For a company session
 * the tenant comes from the JWT — the backend ignores any forged `companyId`
 * query key — so no cross-tenant fleet can leak through.
 */
export const companyFleetApi = {
  list: (query: CompanyFleetQuery, signal?: AbortSignal) =>
    request<CompanyFleetResponse>(`/companies/fleet?${buildQuery(query)}`, {
      signal,
    }),
};