import { request } from "./apiClient";

export interface MoamalatGatewayParams {
  MID: string;
  TID: string;
  AmountTrxn: string;
  MerchantReference: string;
  TrxDateTime: string;
  SecureHash: string;
}

interface GatewayConfigResponse {
  status: string;
  data: { lightBoxUrl: string; env: string };
}

interface InitiateResponse {
  status: string;
  data: {
    payment: { id: string; bookingId: string; amount: number; merchantReference: string };
    gateway: { lightBoxUrl: string; env: string; params: MoamalatGatewayParams };
  };
}

export interface VerifyResult {
  verified: boolean;
  merchantReference: string;
  systemReference?: string;
  networkReference?: string;
  amount?: number;
  status?: string;
  alreadyProcessed?: boolean;
  booking?: { id: string; bookingStatus: string; paymentStatus: string } | null;
}

interface VerifyResponse {
  status: string;
  data: VerifyResult;
}

/**
 * Moamalat gateway surface consumed by the payment page. The LightBox config
 * endpoint is public (only script URL + env), while initiate/verify require the
 * customer JWT. initiate/verify are idempotent via the backend middleware.
 */
export const moamalatApi = {
  getConfig: (): Promise<GatewayConfigResponse> =>
    request("/payments/moamalat/config", { auth: false }),

  initiate: (bookingId: string): Promise<InitiateResponse> =>
    request("/payments/moamalat/init", {
      method: "POST",
      auth: true,
      body: { bookingId },
      headers: { "Idempotency-Key": crypto.randomUUID() },
    }),

  verify: (payload: {
    merchantReference: string;
    systemReference?: string;
  }): Promise<VerifyResponse> =>
    request("/payments/moamalat/verify", {
      method: "POST",
      auth: true,
      body: payload,
    }),
};