import { request } from "./apiClient";

export interface AggregatorCheckoutResponse {
  status: "success";
  data: {
    paymentId: string;
    aggregatorPaymentId: string;
    checkoutUrl: string;
    expiresAt: string;
    reused: boolean;
  };
}

export const paymentAggregatorApi = {
  initiate: (bookingId: string): Promise<AggregatorCheckoutResponse> =>
    request("/payments/aggregator/init", {
      method: "POST",
      body: { bookingId },
    }),
};
