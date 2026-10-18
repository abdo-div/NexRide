import { moamalatApi } from "./moamalatApi";
import type { MoamalatGatewayParams } from "./moamalatApi";

let lightboxPromise: Promise<LightboxApi> | null = null;
let scriptPromise: Promise<void> | null = null;
let loadedLightboxUrl: string | null = null;
let activeMessageHandler: ((event: MessageEvent) => void) | null = null;
const LIGHTBOX_LOAD_TIMEOUT_MS = 12_000;

export const getLightboxApi = (): LightboxApi | null =>
  window.Lightbox ?? window.lightbox ?? null;

const injectScript = (url: string): Promise<void> => {
  if (getLightboxApi()) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  const pendingScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-moamalat-lightbox]",
    );
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }

    const script = existing ?? document.createElement("script");
    const timeoutId = window.setTimeout(() => {
      cleanup();
      script.remove();
      reject(
        new Error(
          "Moamalat did not respond. Check the gateway configuration or try again.",
        ),
      );
    }, LIGHTBOX_LOAD_TIMEOUT_MS);
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
    const onLoad = () => {
      cleanup();
      script.dataset.loaded = "true";
      resolve();
    };
    const onError = () => {
      cleanup();
      script.remove();
      reject(new Error("Failed to load the Moamalat payment script"));
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = url;
      script.async = true;
      script.setAttribute("data-moamalat-lightbox", "true");
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    scriptPromise = null;
    throw error;
  });

  scriptPromise = pendingScriptPromise;
  return pendingScriptPromise;
};

/**
 * Ensures the Moamalat LightBox global is ready exactly once per page load.
 * The gateway registers `window.Lightbox` shortly after the script loads, so a
 * short grace window with a single retry is applied like the reference client.
 */
export const loadMoamalatLightbox = async (): Promise<LightboxApi> => {
  const existing = getLightboxApi();
  if (existing) return existing;

  if (!lightboxPromise) {
    lightboxPromise = (async () => {
      const { data } = await moamalatApi.getConfig();
      loadedLightboxUrl = data.lightBoxUrl;
      const loadAttempt = async () => {
        try {
          await injectScript(data.lightBoxUrl);
        } catch {
          // Retry once below; the second attempt reports a useful error.
        }
        if (!getLightboxApi()) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        return getLightboxApi();
      };

      let api = await loadAttempt();
      if (!api) {
        document.querySelector("script[data-moamalat-lightbox]")?.remove();
        scriptPromise = null;
        api = await loadAttempt();
      }
      if (!api) {
        document.querySelector("script[data-moamalat-lightbox]")?.remove();
        scriptPromise = null;
        throw new Error("The Moamalat payment window could not be opened");
      }
      return api;
    })().finally(() => {
      lightboxPromise = null;
    });
  }

  return lightboxPromise;
};

export interface LightboxCallbacks {
  onComplete: (response: LightboxCompleteResponse) => void;
  onError?: (error?: LightboxErrorPayload) => void;
  onCancel?: () => void;
}

export const getMoamalatErrorMessage = (
  error?: LightboxErrorPayload,
): string | null => {
  const detail = [error?.message, error?.Info, error?.error].find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
  if (!detail) return null;

  const code = error?.errorCode;
  return code === undefined || code === null || code === ""
    ? detail.trim()
    : `${detail.trim()} (code: ${String(code)})`;
};

export const openMoamalatLightbox = (
  params: MoamalatGatewayParams,
  callbacks: LightboxCallbacks,
): void => {
  const api = getLightboxApi();
  if (!api) {
    throw new Error("The Moamalat payment window is not loaded");
  }

  document.querySelectorAll("iframe#Lightbox").forEach((item) => item.remove());
  if (activeMessageHandler) {
    window.removeEventListener("message", activeMessageHandler);
  }

  const scriptUrl =
    loadedLightboxUrl ||
    document.querySelector<HTMLScriptElement>("script[data-moamalat-lightbox]")?.src;
  if (!scriptUrl) throw new Error("The Moamalat checkout URL is unavailable");

  const gatewayOrigin = new URL(scriptUrl).origin;
  const checkoutUrl = new URL("/Home/LightboxHostedCheckout/", gatewayOrigin);
  checkoutUrl.searchParams.set("paymentMethodFromLightBox", "2");
  checkoutUrl.searchParams.set("OrderID", "");
  checkoutUrl.searchParams.set("MID", params.MID);
  checkoutUrl.searchParams.set("MerchantReference", params.MerchantReference);
  checkoutUrl.searchParams.set("amount", String(Number(params.AmountTrxn) / 1000));
  checkoutUrl.searchParams.set("TID", params.TID);
  checkoutUrl.searchParams.set("secureHashAnonymous", params.SecureHash);
  checkoutUrl.searchParams.set("trxDateTime", params.TrxDateTime);
  checkoutUrl.searchParams.set("feeAmount", "0");

  let settled = false;
  const cleanup = () => {
    document.querySelectorAll("iframe#Lightbox").forEach((item) => item.remove());
    if (activeMessageHandler) {
      window.removeEventListener("message", activeMessageHandler);
      activeMessageHandler = null;
    }
  };
  activeMessageHandler = (event: MessageEvent) => {
    if (event.origin !== gatewayOrigin || !event.data || settled) return;
    if (event.data.callback === "completeCallback") {
      settled = true;
      cleanup();
      callbacks.onComplete(event.data.paymentInfo ?? {});
    } else if (event.data.callback === "errorCallback") {
      settled = true;
      cleanup();
      callbacks.onError?.(event.data.Info);
    } else if (event.data.callback === "cancelCallback") {
      settled = true;
      cleanup();
      callbacks.onCancel?.();
    }
  };
  window.addEventListener("message", activeMessageHandler);

  const iframe = document.createElement("iframe");
  iframe.id = "Lightbox";
  iframe.title = "Moamalat secure payment";
  iframe.src = checkoutUrl.toString();
  iframe.style.cssText =
    "z-index:999999;display:block;background:transparent;border:0;overflow:auto;" +
    "visibility:visible;margin:0;padding:0;position:fixed;inset:0;width:100%;height:100%;";
  document.body.appendChild(iframe);
};

export const closeMoamalatLightbox = (): void => {
  document.querySelectorAll("iframe#Lightbox").forEach((item) => item.remove());
  if (activeMessageHandler) {
    window.removeEventListener("message", activeMessageHandler);
    activeMessageHandler = null;
  }
  try {
    getLightboxApi()?.Checkout.closeLightbox();
  } catch {
    /* ignore */
  }
};
