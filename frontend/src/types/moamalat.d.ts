export {};

declare global {
  interface LightboxCompleteResponse {
    SystemReference?: string;
    systemReference?: string;
    NetworkReference?: string;
    networkReference?: string;
    AmountTrxn?: string;
    MerchantReference?: string;
  }

  /** Error payload posted by the LightBox via postMessage/errorCallback. */
  interface LightboxErrorPayload {
    cbName?: string;
    callback?: string;
    error?: string;
    Info?: string;
    errorCode?: number | string;
    timestamp?: string;
    orderId?: string;
    status?: number;
    message?: string;
  }

  interface LightboxCheckoutConfig {
    MID: string;
    TID: string;
    AmountTrxn: string;
    MerchantReference: string;
    TrxDateTime: string;
    SecureHash: string;
    completeCallback: (response: LightboxCompleteResponse) => void;
    errorCallback?: (error?: LightboxErrorPayload) => void;
    cancelCallback?: () => void;
  }

  interface LightboxApi {
    Checkout: {
      configure: LightboxCheckoutConfig;
      showLightbox: () => void;
      closeLightbox: () => void;
    };
  }

  interface Window {
    Lightbox?: LightboxApi;
    lightbox?: LightboxApi;
  }
}