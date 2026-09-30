import { moamalatApi } from "./moamalatApi";
import type { MoamalatGatewayParams } from "./moamalatApi";

let lightboxPromise: Promise<LightboxApi> | null = null;
let scriptPromise: Promise<void> | null = null;

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
    const cleanup = () => {
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
  onError?: () => void;
  onCancel?: () => void;
}

export const openMoamalatLightbox = (
  params: MoamalatGatewayParams,
  callbacks: LightboxCallbacks,
): void => {
  const api = getLightboxApi();
  if (!api) {
    throw new Error("The Moamalat payment window is not loaded");
  }
  api.Checkout.configure = {
    ...params,
    completeCallback: (response) => callbacks.onComplete(response),
    errorCallback: () => callbacks.onError?.(),
    cancelCallback: () => callbacks.onCancel?.(),
  };
  api.Checkout.showLightbox();
};

export const closeMoamalatLightbox = (): void => {
  getLightboxApi()?.Checkout.closeLightbox();
};