import { request, API_BASE_URL } from "./apiClient";
import type { VehicleDto } from "../types/vehicle";

interface VehiclesResponse {
  status: string;
  results: number;
  data: { vehicles: VehicleDto[] };
}

interface VehicleResponse {
  status: string;
  data: { vehicle: VehicleDto };
}

/**
 * Only PUBLISHED + AVAILABLE vehicles are bookable, so the public fleet
 * listing filters server-side. Sorting and the 100-item cap mirror the
 * backend's APIFeatures bounds.
 */
const AVAILABLE_QUERY =
  "/vehicles?operationalStatus=AVAILABLE&listingStatus=PUBLISHED&sort=-createdAt&limit=100";

/** Public origin of the API, used to resolve photo filenames. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");

export const vehicleApi = {
  listAvailable: (signal?: AbortSignal) =>
    request<VehiclesResponse>(AVAILABLE_QUERY, { auth: false, signal }),

  /**
   * Single vehicle for the detail page. Public (no auth) and populated with the
   * owning company plus its reviews, so the page can render the operator
   * profile and rating breakdown without a second round-trip.
   * Throws ApiError(404) when the id is unknown or not yet published.
   */
  getById: (id: string, signal?: AbortSignal) =>
    request<VehicleResponse>(`/vehicles/${encodeURIComponent(id)}`, {
      auth: false,
      signal,
    }),

  /** Other bookable vehicles of the same body type, used by "Similar vehicles". */
  listSimilar: (type: string, signal?: AbortSignal) =>
    request<VehiclesResponse>(
      `/vehicles?operationalStatus=AVAILABLE&listingStatus=PUBLISHED&type=${encodeURIComponent(
        type,
      )}&sort=-createdAt&limit=12`,
      { auth: false, signal },
    ),
};
