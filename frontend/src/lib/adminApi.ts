import { request } from "./apiClient";
import type { BookingDto } from "../types/booking";
import type { VehicleDto } from "../types/vehicle";
import type {
  AdminCompanyDto,
  AdminPaymentDto,
  CompanyStatus,
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
};