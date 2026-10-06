import { request } from "./apiClient";
import type {
  CompanyVehicleData,
  CompanyVehicleProfile,
} from "../types/companyVehicle";

interface CompanyVehicleResponse {
  status: string;
  data: CompanyVehicleData;
}

export interface CompanyVehicleUpdateResponse {
  status: string;
  data: { vehicle: CompanyVehicleProfile };
}

/** JSON patch body for PATCH /cars/:id; a FormData body triggers image upload. */
export type CompanyVehicleUpdateBody = Record<string, unknown> | FormData;

export interface CompanyVehicleTripsQuery {
  search: string;
  page: number;
  limit: number;
}

const buildQuery = (query: CompanyVehicleTripsQuery): string => {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  if (query.search.trim()) params.set("search", query.search.trim());
  return params.toString();
};

/**
 * Vehicle dossier (GET /companies/fleet/:vehicleId). The tenant is resolved
 * server-side from the session — any client-supplied `companyId` is ignored —
 * so a company can never pull another operator's unit by tampering with the
 * URL.
 */
export const companyVehicleApi = {
  detail: (vehicleId: string, query: CompanyVehicleTripsQuery, signal?: AbortSignal) =>
    request<CompanyVehicleResponse>(
      `/companies/fleet/${vehicleId}?${buildQuery(query)}`,
      { signal },
    ),
  /**
   * Update a vehicle (PATCH /cars/:id). The tenant is resolved server-side and
   * the write is scoped to the caller's own fleet. Pass a JSON body of only the
   * changed fields, or a FormData body carrying the same fields plus new
   * `images` file entries (uploads replace the current photo set).
   */
  update: (vehicleId: string, body: CompanyVehicleUpdateBody) =>
    request<CompanyVehicleUpdateResponse>(`/cars/${vehicleId}`, {
      method: "PATCH",
      body,
    }),
};