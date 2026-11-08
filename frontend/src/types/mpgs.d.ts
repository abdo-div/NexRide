interface MpgsCheckoutConfiguration {
  session: { id: string };
}

interface MpgsCheckoutApi {
  configure: (configuration: MpgsCheckoutConfiguration) => void;
  showPaymentPage: () => void;
  showEmbeddedPage?: (containerId: string) => void;
}

interface Window {
  Checkout?: MpgsCheckoutApi;
  nexrideMpgsError?: (error: unknown) => void;
}
