import { afterEach, describe, expect, it, vi } from "vitest";
import { openMoamalatLightbox } from "./moamalatLightbox";

describe("openMoamalatLightbox", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens an isolated checkout with the signed backend values", () => {
    const iframe = {
      id: "",
      title: "",
      src: "",
      style: { cssText: "" },
    };
    const appendChild = vi.fn();
    const checkout = {
      configure: {},
      showLightbox: vi.fn(),
      closeLightbox: vi.fn(),
    };

    vi.stubGlobal("window", {
      Lightbox: { Checkout: checkout },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("document", {
      querySelectorAll: vi.fn().mockReturnValue([]),
      querySelector: vi.fn().mockReturnValue({
        src: "https://tnpg.moamalat.net:6006/js/lightbox.js",
      }),
      createElement: vi.fn().mockReturnValue(iframe),
      body: { appendChild },
    });

    openMoamalatLightbox(
      {
        MID: "10081014649",
        TID: "99179395",
        AmountTrxn: "875000",
        MerchantReference: "NX-TEST",
        TrxDateTime: "202610181435",
        SecureHash: "ABC123",
      },
      { onComplete: vi.fn() },
    );

    expect(checkout.showLightbox).not.toHaveBeenCalled();
    expect(iframe.src).toContain("paymentMethodFromLightBox=2");
    expect(iframe.src).toContain("MID=10081014649");
    expect(iframe.src).toContain("amount=875");
    expect(iframe.src).toContain("trxDateTime=202610181435");
    expect(appendChild).toHaveBeenCalledWith(iframe);
  });
});
