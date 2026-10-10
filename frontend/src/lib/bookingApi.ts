import { request, API_BASE_URL, ApiError } from "./apiClient";
import { getToken } from "./tokenStorage";
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
  data: {
    booking: BookingDto;
    payment?: {
      _id: string;
      amount: number;
      paymentMethod: "CASH_ON_DELIVERY";
      status: "PENDING";
    };
  };
}

export interface MyBookingsResponse {
  status: string;
  results: number;
  data: { bookings: BookingDto[] };
}

export interface CreateBookingPayload {
  vehicleId: string;
  startDate: string;
  endDate: string;
  pickupLocation?: string;
  pickupMethod?: "BRANCH_PICKUP" | "DELIVERY";
  paymentMethod?: "CASH_ON_DELIVERY";
  addonIds?: Array<"insurance" | "driver" | "childseat" | "delivery">;
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

  /**
   * Fetch the logged-in customer's own bookings (self-service ledger).
   * The backend scopes the query to req.user.id, so this is always the
   * authenticated user's data.
   */
  listMy: (signal?: AbortSignal): Promise<MyBookingsResponse> =>
    request<MyBookingsResponse>("/bookings/my-bookings", { auth: true, signal }),

  /**
   * Request cancellation of a booking owned by the logged-in customer.
   * Applies the cancellation business rules (free-cancellation windows,
   * refund handling) on the backend.
   */
  cancel: (id: string): Promise<BookingResponse> =>
    request<BookingResponse>(`/bookings/${encodeURIComponent(id)}/cancel`, {
      method: "PATCH",
      auth: true,
    }),

  /**
   * Downloads the official invoice PDF for a paid booking. Uses a raw fetch
   * (the endpoint streams binary application/pdf, not JSON) so the JWT is
   * attached as a header and the response is returned as a Blob for the caller
   * to save.
   */
  downloadInvoice: async (bookingId: string): Promise<Blob> => {
    const token = getToken();
    const response = await fetch(
      `${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}/invoice`,
      {
        headers: {
          Accept: "application/pdf",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      },
    );

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const payload = (await response.json()) as { message?: unknown };
        if (typeof payload.message === "string" && payload.message) {
          message = payload.message;
        }
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(message, response.status);
    }

    return response.blob();
  },
};
