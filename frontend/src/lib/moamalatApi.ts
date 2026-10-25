import { request } from "./apiClient";

export interface MoamalatGatewayParams {
  MID: string;
  TID: string;
  AmountTrxn: string;
  MerchantReference: string;
  TrxDateTime: string;
  SecureHash: string;
}

export interface GatewayConfigResponse {
  status: string;
  lightBoxUrl?: string;
  env?: string;
  data: { lightBoxUrl: string; env: string };
}

export interface InitiateResponse {
  status: string;
  MID?: string;
  TID?: string;
  AmountTrxn?: string;
  MerchantReference?: string;
  TrxDateTime?: string;
  SecureHash?: string;
  data: {
    payment: { id: string; bookingId: string | null; amount: number; merchantReference: string };
    gateway: { lightBoxUrl: string; env: string; params: MoamalatGatewayParams };
  };
}

export interface VerifyResult {
  verified: boolean;
  retryable?: boolean;
  merchantReference: string;
  systemReference?: string;
  networkReference?: string;
  amount?: number;
  status?: string;
  reason?: string;
  alreadyProcessed?: boolean;
  booking?: { id: string; bookingStatus: string; paymentStatus: string; vehicleId?: string } | null;
}

export interface VerifyResponse {
  status?: string;
  verified?: boolean;
  retryable?: boolean;
  reason?: string;
  merchantReference?: string;
  systemReference?: string;
  networkReference?: string;
  amount?: number | string;
  data?: VerifyResult;
}

export interface ReleaseResponse {
  status: string;
  data: {
    released: boolean;
    bookingStatus: string | null;
    paymentStatus: string | null;
  };
}

/**
 * Moamalat gateway API surface.
 */
export const moamalatApi = {
  getConfig: (): Promise<GatewayConfigResponse> =>
    request("/payments/moamalat/config"),

  create: (payload: {
    amount: number;
    reference?: string;
    bookingId?: string;
  }): Promise<InitiateResponse> =>
    request("/payments/moamalat/create", {
      method: "POST",
      body: payload,
    }),

  initiate: (bookingId: string): Promise<InitiateResponse> =>
    request("/payments/moamalat/init", {
      method: "POST",
      body: { bookingId },
      headers: { "Idempotency-Key": crypto.randomUUID() },
    }),

  verify: (payload: {
    merchantReference: string;
    systemReference?: string | null;
  }): Promise<VerifyResponse> =>
    request("/payments/moamalat/verify", {
      method: "POST",
      body: payload,
    }),

  /**
   * Releases a booking whose payment did not succeed so the vehicle is not left
   * rented to the customer. Called when the gateway errors or the user abandons
   * checkout before a successful capture.
   */
  release: (bookingId: string): Promise<ReleaseResponse> =>
    request("/payments/moamalat/release", {
      method: "POST",
      body: { bookingId },
      headers: { "Idempotency-Key": crypto.randomUUID() },
    }),
};
