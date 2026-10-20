import { useEffect, useState } from "react";
import { Wifi, WifiOff, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  nextNetworkNotice,
  type NetworkNotice,
} from "../../utils/networkStatus";

export function NetworkStatusBanner() {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<NetworkNotice>(() =>
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : null,
  );

  useEffect(() => {
    const updateStatus = (event: "online" | "offline") => {
      setNotice((current) => nextNetworkNotice(current, event));
    };

    const handleOffline = () => updateStatus("offline");
    const handleOnline = () => updateStatus("online");

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (notice !== "restored") return;
    const timeout = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  if (!notice) return null;

  const restored = notice === "restored";
  const Icon = restored ? Wifi : WifiOff;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-20 z-[100] flex justify-center px-4"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`pointer-events-auto flex w-full max-w-xl items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl sm:items-center ${
          restored
            ? "border-emerald-300/40 bg-emerald-950/95 text-emerald-50"
            : "border-amber-300/40 bg-slate-950/95 text-amber-50"
        }`}
      >
        <span
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl sm:mt-0 ${
            restored ? "bg-emerald-400/15" : "bg-amber-400/15"
          }`}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {t(`networkStatus.${restored ? "restoredTitle" : "offlineTitle"}`)}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-current/75 sm:text-sm">
            {t(`networkStatus.${restored ? "restoredBody" : "offlineBody"}`)}
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
