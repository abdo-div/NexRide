import { request } from "./apiClient";
import type { CompanyBookingsData, CompanyBookingsQuery } from "../types/companyBookings";

interface CompanyBookingsResponse {
  status: string;
  data: CompanyBookingsData;
}

interface CompanyBookingStatusResponse {
  status: string;
  data: { booking?: Record<string, unknown> };
}

interface CompanyBookingCollectCashResponse {
  status: string;
  data: { payment?: Record<string, unknown> };
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

  /**
   * Advance the bookings lifecycle (PATCH /bookings/:id/status). Company and
   * admin only; the owning tenant is enforced server-side, so an operator can
   * never move another tenant's booking.
   */
  updateStatus: (bookingId: string, status: string, signal?: AbortSignal) =>
    request<CompanyBookingStatusResponse>(`/bookings/${bookingId}/status`, {
      method: "PATCH",
      body: { status },
      signal,
    }),

  /**
   * Attest a cash-on-delivery payment at pick-up (PATCH /payments/:id/collect-cash).
   * Only valid while the ledger row is a pending CASH_ON_DELIVERY payment.
   */
  collectCash: (paymentId: string, signal?: AbortSignal) =>
    request<CompanyBookingCollectCashResponse>(`/payments/${paymentId}/collect-cash`, {
      method: "PATCH",
      signal,
    }),

  /**
   * Cancel a booking (PATCH /bookings/:id/cancel). Tenant-scoped; the company
   * can cancel any of its own non-terminal bookings with an optional reason.
   */
  cancel: (bookingId: string, reason: string, signal?: AbortSignal) =>
    request<CompanyBookingStatusResponse>(`/bookings/${bookingId}/cancel`, {
      method: "PATCH",
      body: { reason },
      signal,
    }),
};