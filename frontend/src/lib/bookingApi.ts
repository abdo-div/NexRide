import { request } from "./apiClient";
import type { BookingDto } from "../types/booking";

export interface AvailabilityResult {
  isAvailable: boolean;
}

interface AvailabilityResponse {
  status: string;
  data: AvailabilityResult;
}

interface BookingResponse {
  status: string;
  data: { booking: BookingDto };
}

export interface CreateBookingPayload {
  vehicleId: string;
  startDate: string;
  endDate: string;
  pickupLocation?: string;
  pickupMethod?: "BRANCH_PICKUP" | "DELIVERY";
}

/**
 * Booking API surface used by the checkout flow. The availability check is
 * public (same data the fleet search derives), while create/get require the
 * customer's JWT; POST also sends an Idempotency-Key so the backend collapses
 * retries of the same submission.
 */
export const bookingApi = {
  checkAvailability: (
    vehicleId: string,
    startDate: string,
    endDate: string,
    signal?: AbortSignal,
  ): Promise<AvailabilityResponse> => {
    const query = new URLSearchParams({
      vehicleId,
      startDate,
      endDate,
    });
    return request(`/bookings/check-availability?${query.toString()}`, {
      auth: false,
      signal,
    });
  },

  create: (payload: CreateBookingPayload): Promise<BookingResponse> =>
    request<BookingResponse>("/bookings", {
      method: "POST",
      auth: true,
      body: payload,
      headers: { "Idempotency-Key": crypto.randomUUID() },
    }),

  get: (id: string, signal?: AbortSignal): Promise<BookingResponse> =>
    request(`/bookings/${encodeURIComponent(id)}`, { auth: true, signal }),
};