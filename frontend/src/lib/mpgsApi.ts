import { request } from "./apiClient";

export interface MpgsConfigResponse {
  status: "success";
  data: {
    environment: "test" | "production";
    checkoutScriptUrl: string;
    currency: string;
  };
}

export interface MpgsCheckout {
  provider: "MPGS";
  paymentId: string;
  bookingId: string;
  orderId: string;
  amount: string;
  currency: string;
  operation: "PURCHASE" | "AUTHORIZE";
  sessionId: string;
  sessionVersion: string | null;
  successIndicator: string;
  reused?: boolean;
}

export interface MpgsVerifyResponse {
  status: "success";
  data: {
    verified: boolean;
    outcome: "SUCCEEDED" | "PENDING" | "FAILED" | "MISMATCH" | "UNVERIFIED";
    alreadyProcessed: boolean;
    indicatorMatches: boolean;
    orderId: string;
    gatewayStatus: string | null;
    transactionId: string | null;
    booking: {
      id: string;
      bookingStatus: string;
      paymentStatus: string;
      vehicleId: string | null;
    } | null;
  };
}

export const mpgsApi = {
  getConfig: (): Promise<MpgsConfigResponse> =>
    request("/payments/mpgs/config"),

  initiate: (bookingId: string): Promise<{ status: "success"; data: MpgsCheckout }> =>
    request("/payments/mpgs/init", {
      method: "POST",
      body: { bookingId },
      headers: { "Idempotency-Key": `mpgs-init-${bookingId}` },
    }),

  verify: (payload: {
    orderId: string;
    resultIndicator?: string;
  }): Promise<MpgsVerifyResponse> =>
    request("/payments/mpgs/verify", {
      method: "POST",
      body: payload,
    }),

  processRefund: (bookingId: string): Promise<{
    status: "success";
    data: {
      skipped: boolean;
      reason: string | null;
      outcome: "SUCCEEDED" | "PENDING" | "FAILED" | null;
      refunded: boolean;
      alreadyProcessed: boolean;
      refundId: string | null;
      refundTransactionId: string | null;
      gatewayCode: string | null;
    };
  }> =>
    request("/payments/mpgs/refunds/process", {
      method: "POST",
      body: { bookingId },
      headers: { "Idempotency-Key": `mpgs-refund-${bookingId}` },
    }),
};
