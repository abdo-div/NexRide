import { request } from "./apiClient";

export const mpgsSimulatorApi = {
  initiate: (bookingId: string): Promise<{
    status: "success";
    data: {
      provider: "MPGS_SIMULATOR";
      orderId: string;
      sessionId: string;
      amount: string;
      currency: string;
      simulated: true;
    };
  }> => request("/payments/mpgs/simulator/init", {
    method: "POST",
    body: { bookingId },
    headers: { "Idempotency-Key": `mpgs-simulator-init-${bookingId}` },
  }),

  complete: (orderId: string): Promise<{
    status: "success";
    data: {
      verified: true;
      simulated: true;
      alreadyProcessed: boolean;
      orderId: string;
      booking: {
        id: string;
        bookingStatus: string;
        paymentStatus: string;
        vehicleId: string;
      };
    };
  }> => request("/payments/mpgs/simulator/complete", {
    method: "POST",
    body: { orderId },
    headers: { "Idempotency-Key": `mpgs-simulator-complete-${orderId}` },
  }),
};
