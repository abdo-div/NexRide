import { useEffect, useState } from "react";
import { ServerOff, Wifi, WifiOff, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  nextNetworkNotice,
  type NetworkNotice,
  type NetworkStatusEvent,
} from "../../utils/networkStatus";
import {
  API_AVAILABLE_EVENT,
  API_UNAVAILABLE_EVENT,
} from "../../lib/apiAvailability";

export function NetworkStatusBanner() {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<NetworkNotice>(() =>
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : null,
  );

  useEffect(() => {
    const updateStatus = (event: NetworkStatusEvent) => {
      setNotice((current) => nextNetworkNotice(current, event));
    };

    const handleOffline = () => updateStatus("offline");
    const handleOnline = () => updateStatus("online");
    const handleApiUnavailable = () => updateStatus("api-unavailable");
    const handleApiAvailable = () => updateStatus("api-available");

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener(API_UNAVAILABLE_EVENT, handleApiUnavailable);
    window.addEventListener(API_AVAILABLE_EVENT, handleApiAvailable);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener(API_UNAVAILABLE_EVENT, handleApiUnavailable);
      window.removeEventListener(API_AVAILABLE_EVENT, handleApiAvailable);
    };
  }, []);

  useEffect(() => {
    if (notice !== "restored" && notice !== "serviceRestored") return;
    const timeout = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  if (!notice) return null;

  const restored = notice === "restored";
  const serviceRestored = notice === "serviceRestored";
  const positive = restored || serviceRestored;
  const serviceUnavailable = notice === "serviceUnavailable";
  const Icon = positive ? Wifi : serviceUnavailable ? ServerOff : WifiOff;
  const translationKey = serviceRestored
    ? "serviceRestored"
    : serviceUnavailable
      ? "serviceUnavailable"
      : restored
        ? "restored"
        : "offline";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-20 z-[100] flex justify-center px-4"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`pointer-events-auto flex w-full max-w-xl items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl sm:items-center ${
          positive
            ? "border-emerald-300/40 bg-emerald-950/95 text-emerald-50"
            : "border-amber-300/40 bg-slate-950/95 text-amber-50"
        }`}
      >
        <span
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl sm:mt-0 ${
            positive ? "bg-emerald-400/15" : "bg-amber-400/15"
          }`}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {t(`networkStatus.${translationKey}Title`)}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-current/75 sm:text-sm">
            {t(`networkStatus.${translationKey}Body`)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNotice(null)}
          className="rounded-lg p-1.5 text-current/70 transition hover:bg-white/10 hover:text-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label={t("networkStatus.dismiss")}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
