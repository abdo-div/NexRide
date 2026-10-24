import { afterEach, describe, expect, it, vi } from "vitest";
import { openMoamalatLightbox } from "./moamalatLightbox";

describe("openMoamalatLightbox", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses Moamalat's supported checkout API with the signed backend values", () => {
    const checkout = {
      configure: {},
      showLightbox: vi.fn(),
      closeLightbox: vi.fn(),
    };

    vi.stubGlobal("window", {
      Lightbox: { Checkout: checkout },
    });

    const onComplete = vi.fn();
    openMoamalatLightbox(
      {
        MID: "10081014649",
        TID: "99179395",
        AmountTrxn: "875000",
        MerchantReference: "NX-TEST",
        TrxDateTime: "202610181435",
        SecureHash: "ABC123",
      },
      { onComplete },
    );

    expect(checkout.showLightbox).toHaveBeenCalledOnce();
    expect(checkout.configure).toMatchObject({
      paymentMethodFromLightBox: 2,
      MID: "10081014649",
      TID: "99179395",
      AmountTrxn: "875000",
      MerchantReference: "NX-TEST",
      TrxDateTime: "202610181435",
      SecureHash: "ABC123",
    });

    const configured = checkout.configure as unknown as LightboxCheckoutConfig;
    configured.completeCallback({ SystemReference: "SYS-1" });
    expect(checkout.closeLightbox).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith({ SystemReference: "SYS-1" });
  });
});
