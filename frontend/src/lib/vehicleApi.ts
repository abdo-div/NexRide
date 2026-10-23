import { request, API_BASE_URL } from "./apiClient";
import type { VehicleDto, VehicleReviewDto } from "../types/vehicle";

interface VehiclesResponse {
  status: string;
  results: number;
  data: { vehicles: VehicleDto[] };
}

interface VehicleResponse {
  status: string;
  data: { vehicle: VehicleDto };
}

export interface ReviewEligibility {
  eligible: boolean;
  completed: boolean;
  reviewed: boolean;
  review: VehicleReviewDto | null;
  vehicleId: string;
  companyId: string;
}

/**
 * Customer search criteria. Every field is optional; the backend applies the
 * ones provided. `location`, `type`, `minPrice`/`maxPrice` filter the fleet,
 * while `startDate`/`endDate` make availability real by excluding vehicles
 * that are booked in that window (computed server-side from the bookings).
 */
export interface VehicleSearchArgs {
  location?: string;
  type?: string;
  transmission?: string;
  fuelType?: string;
  minPrice?: number;
  maxPrice?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

const buildSearchQuery = (args: VehicleSearchArgs): string => {
  const query = new URLSearchParams();
  if (args.location) query.set("location", args.location);
  if (args.type) query.set("type", args.type);
  if (args.transmission) query.set("transmission", args.transmission);
  if (args.fuelType) query.set("fuelType", args.fuelType);
  if (args.minPrice !== undefined) query.set("minPrice", String(args.minPrice));
  if (args.maxPrice !== undefined) query.set("maxPrice", String(args.maxPrice));
  if (args.startDate) query.set("startDate", args.startDate);
  if (args.endDate) query.set("endDate", args.endDate);
  query.set("limit", String(args.limit ?? 100));
  return `/vehicles/search?${query.toString()}`;
};

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
    request<VehiclesResponse>(AVAILABLE_QUERY, { signal }),

  /** Search available vehicles by location, type, price and date availability. */
  search: (args: VehicleSearchArgs = {}, signal?: AbortSignal) =>
    request<VehiclesResponse>(buildSearchQuery(args), { signal }),

  /**
   * Single vehicle for the detail page. Public (no auth) and populated with the
   * owning company plus its reviews, so the page can render the operator
   * profile and rating breakdown without a second round-trip.
   * Throws ApiError(404) when the id is unknown or not yet published.
   */
  getById: (id: string, signal?: AbortSignal) =>
    request<VehicleResponse>(`/vehicles/${encodeURIComponent(id)}`, {
      signal,
    }),

  /** Other bookable vehicles of the same body type, used by "Similar vehicles". */
  listSimilar: (type: string, signal?: AbortSignal) =>
    request<VehiclesResponse>(
      `/vehicles?operationalStatus=AVAILABLE&listingStatus=PUBLISHED&type=${encodeURIComponent(
        type,
      )}&sort=-createdAt&limit=12`,
      { signal },
    ),

  reviewEligibility: (vehicleId: string, bookingId: string, signal?: AbortSignal) =>
    request<{ status: string; data: { eligibility: ReviewEligibility } }>(
      `/vehicles/${encodeURIComponent(vehicleId)}/reviews/eligibility?bookingId=${encodeURIComponent(bookingId)}`,
      { signal },
    ),

  createReview: (vehicleId: string, bookingId: string, rating: number, review: string) =>
    request<{ status: string; data: { review: VehicleReviewDto } }>(
      `/vehicles/${encodeURIComponent(vehicleId)}/reviews`,
      {
        method: "POST",
        body: { bookingId, rating, review },
      },
    ),

  updateReview: (vehicleId: string, reviewId: string, rating: number, review: string) =>
    request<{ status: string; data: { review: VehicleReviewDto } }>(
      `/vehicles/${encodeURIComponent(vehicleId)}/reviews/${encodeURIComponent(reviewId)}`,
      { method: "PATCH", body: { rating, review } },
    ),

  deleteReview: (vehicleId: string, reviewId: string) =>
    request<void>(`/vehicles/${encodeURIComponent(vehicleId)}/reviews/${encodeURIComponent(reviewId)}`, { method: "DELETE" }),
};
