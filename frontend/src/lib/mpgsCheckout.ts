import { mpgsApi } from "./mpgsApi";

let scriptPromise: Promise<MpgsCheckoutApi> | null = null;

const assertSafeScriptUrl = (value: string): string => {
  const url = new URL(value, window.location.origin);
  const localHttp =
    url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error("The MPGS checkout script must use HTTPS");
  }
  if (!url.pathname.endsWith("/static/checkout/checkout.min.js")) {
    throw new Error("The MPGS checkout script URL is invalid");
  }
  return url.toString();
};

export const loadMpgsCheckout = async (): Promise<MpgsCheckoutApi> => {
  if (window.Checkout) return window.Checkout;
  if (scriptPromise) return scriptPromise;

  scriptPromise = mpgsApi
    .getConfig()
    .then(({ data }) =>
      new Promise<MpgsCheckoutApi>((resolve, reject) => {
        const src = assertSafeScriptUrl(data.checkoutScriptUrl);
        const existing = document.querySelector<HTMLScriptElement>(
          "script[data-mpgs-checkout]",
        );
        const script = existing ?? document.createElement("script");

        const ready = () => {
          if (!window.Checkout) {
            reject(new Error("MPGS loaded without exposing the Checkout API"));
            return;
          }
          resolve(window.Checkout);
        };
        script.addEventListener("load", ready, { once: true });
        script.addEventListener(
          "error",
          () => reject(new Error("Failed to load the MPGS checkout page")),
          { once: true },
        );
        if (!existing) {
          script.src = src;
          script.async = true;
          script.setAttribute("data-mpgs-checkout", "true");
          document.head.appendChild(script);
        }
      }),
    )
    .catch((error) => {
      scriptPromise = null;
      document.querySelector("script[data-mpgs-checkout]")?.remove();
      throw error;
    });

  return scriptPromise;
};

export const openMpgsCheckout = async (sessionId: string): Promise<void> => {
  if (!sessionId.trim()) throw new Error("MPGS session ID is required");
  const checkout = await loadMpgsCheckout();
  checkout.configure({ session: { id: sessionId } });
  checkout.showPaymentPage();
};

export const rememberMpgsAttempt = (attempt: {
  orderId: string;
  bookingId: string;
  vehicleId: string;
}) => {
  sessionStorage.setItem("nexride.mpgs.attempt", JSON.stringify(attempt));
};

export const readMpgsAttempt = () => {
  try {
    const raw = sessionStorage.getItem("nexride.mpgs.attempt");
    if (!raw) return null;
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof value.orderId !== "string" ||
      typeof value.bookingId !== "string" ||
      typeof value.vehicleId !== "string"
    ) return null;
    return value as { orderId: string; bookingId: string; vehicleId: string };
  } catch {
    return null;
  }
};

export const forgetMpgsAttempt = () =>
  sessionStorage.removeItem("nexride.mpgs.attempt");
