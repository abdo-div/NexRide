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
  merchantReference?: string;
  systemReference?: string;
  networkReference?: string;
  amount?: number | string;
  data?: VerifyResult;
}

/**
 * Moamalat gateway API surface.
 */
export const moamalatApi = {
  getConfig: (): Promise<GatewayConfigResponse> =>
    request("/payments/moamalat/config", { auth: false }),

  create: (payload: {
    amount: number;
    reference?: string;
    bookingId?: string;
  }): Promise<InitiateResponse> =>
    request("/payments/moamalat/create", {
      method: "POST",
      auth: true,
      body: payload,
    }),

  initiate: (bookingId: string): Promise<InitiateResponse> =>
    request("/payments/moamalat/init", {
      method: "POST",
      auth: true,
      body: { bookingId },
      headers: { "Idempotency-Key": crypto.randomUUID() },
    }),

  verify: (payload: {
    merchantReference: string;
    systemReference?: string | null;
  }): Promise<VerifyResponse> =>
    request("/payments/moamalat/verify", {
      method: "POST",
      auth: false,
      body: payload,
    }),
};