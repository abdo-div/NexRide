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

  interface LightboxCheckoutConfig {
    MID: string;
    TID: string;
    AmountTrxn: string;
    MerchantReference: string;
    TrxDateTime: string;
    SecureHash: string;
    completeCallback: (response: LightboxCompleteResponse) => void;
    errorCallback?: () => void;
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