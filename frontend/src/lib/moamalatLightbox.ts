import { moamalatApi } from "./moamalatApi";
import type { MoamalatGatewayParams } from "./moamalatApi";

let lightboxPromise: Promise<LightboxApi> | null = null;
let scriptPromise: Promise<void> | null = null;
const LIGHTBOX_LOAD_TIMEOUT_MS = 12_000;
// Some Moamalat error pages (notably the sandbox's "Order Not Found" screen)
// do not post an errorCallback to the merchant page. Return control to NexRide
// after a bounded checkout; the server-side hold deadline still protects fleet
// availability without turning a temporary issuer outage into an instant cancel.
const LIGHTBOX_SESSION_TIMEOUT_MS = 3 * 60_000;

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
  demoAction?: {
    label: string;
    onClick: () => void | Promise<void>;
  };
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

  let settled = false;
  let sessionTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let removalObserver: MutationObserver | null = null;
  let demoButton: HTMLButtonElement | null = null;
  const close = () => {
    try {
      api.Checkout.closeLightbox();
    } catch {
      /* The gateway may already have closed its own window. */
    }
  };
  const cleanup = () => {
    if (sessionTimeoutId !== null) globalThis.clearTimeout(sessionTimeoutId);
    removalObserver?.disconnect();
    demoButton?.remove();
    demoButton = null;
  };
  const settle = (callback: () => void) => {
    if (settled) return;
    settled = true;
    cleanup();
    close();
    callback();
  };

  // Use Moamalat's supported API. It creates the order before opening the
  // hosted checkout; constructing the iframe URL ourselves skips that setup
  // and causes the gateway to report "Order Not Found".
  api.Checkout.configure = {
    paymentMethodFromLightBox: 2,
    ...params,
    completeCallback: (response) => {
      settle(() => callbacks.onComplete(response));
    },
    errorCallback: (error) => {
      settle(() => callbacks.onError?.(error));
    },
    cancelCallback: () => {
      settle(() => callbacks.onCancel?.());
    },
  };

  api.Checkout.showLightbox();

  // The shared Moamalat sandbox intermittently creates the hosted order but
  // fails its own card-processing step with CUBEEX Technical Error. Keep the
  // genuine hosted form visible for integration demonstrations while exposing
  // a clearly labelled, test-only completion control above the cross-origin
  // iframe. Production callers never provide this action.
  if (callbacks.demoAction && typeof document !== "undefined") {
    demoButton = document.createElement("button");
    demoButton.type = "button";
    demoButton.textContent = callbacks.demoAction.label;
    demoButton.setAttribute("data-nexride-demo-payment", "true");
    demoButton.style.cssText =
      "position:fixed;z-index:1000000;left:16px;bottom:16px;" +
      "max-width:calc(100vw - 32px);padding:12px 18px;border:2px solid #fbbf24;" +
      "border-radius:12px;background:#0f172a;color:#fff;font:700 14px/1.3 sans-serif;" +
      "box-shadow:0 12px 32px rgba(0,0,0,.35);cursor:pointer;";
    demoButton.addEventListener("click", () => {
      settle(() => void callbacks.demoAction?.onClick());
    });
    document.body.appendChild(demoButton);
  }

  sessionTimeoutId = globalThis.setTimeout(() => {
    settle(() =>
      callbacks.onError?.({
        message:
          "Moamalat did not complete the payment. Your reservation is still available for another attempt.",
      }),
    );
  }, LIGHTBOX_SESSION_TIMEOUT_MS);

  // Treat closing/removing the gateway iframe without a callback as a cancel.
  // The official script normally posts cancelCallback, but this protects us
  // from its silent error and close paths as well.
  let sawLightbox =
    typeof document !== "undefined" &&
    Boolean(document.getElementById("Lightbox"));
  if (
    typeof MutationObserver !== "undefined" &&
    typeof document !== "undefined" &&
    document.body
  ) {
    removalObserver = new MutationObserver(() => {
      const exists = Boolean(document.getElementById("Lightbox"));
      if (exists) sawLightbox = true;
      if (sawLightbox && !exists && !settled) {
        settle(() => callbacks.onCancel?.());
      }
    });
    removalObserver.observe(document.body, { childList: true, subtree: true });
  }
};

export const closeMoamalatLightbox = (): void => {
  try {
    getLightboxApi()?.Checkout.closeLightbox();
  } catch {
    /* ignore */
  }
};
