import { GitCompareArrows } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useVehicleComparison } from "../../context/useVehicleComparison";

export const ComparisonTray = () => {
  const { t } = useTranslation();
  const { vehicleIds, clearVehicles } = useVehicleComparison();
  if (vehicleIds.length === 0) return null;

  return (
    <aside className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl rounded-2xl border border-blue-200 bg-[#071426]/95 p-3 text-white shadow-2xl backdrop-blur-xl sm:bottom-5 sm:flex sm:items-center sm:justify-between sm:gap-4" aria-label={t("comparison.trayLabel")}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600"><GitCompareArrows className="h-5 w-5" /></span>
        <div>
          <p className="text-sm font-black">{t("comparison.selected", { count: vehicleIds.length })}</p>
          <div className="mt-1 flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((index) => <span key={index} className={`h-1.5 w-8 rounded-full ${index < vehicleIds.length ? "bg-blue-400" : "bg-white/20"}`} />)}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 sm:mt-0">
        <button type="button" onClick={clearVehicles} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white">{t("comparison.clear")}</button>
        <Link to="/compare" aria-disabled={vehicleIds.length < 2} onClick={(event) => { if (vehicleIds.length < 2) event.preventDefault(); }} className={`inline-flex flex-1 items-center justify-center rounded-xl px-5 py-2.5 text-xs font-black sm:flex-none ${vehicleIds.length >= 2 ? "bg-blue-600 text-white hover:bg-blue-500" : "cursor-not-allowed bg-white/10 text-slate-400"}`}>{vehicleIds.length >= 2 ? t("comparison.compareNow") : t("comparison.addAnother")}</Link>
      </div>
    </aside>
  );
};
