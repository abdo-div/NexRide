import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, GitCompareArrows, LoaderCircle, RefreshCw, Trash2, X } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useVehicleComparison } from "../context/useVehicleComparison";
import { vehicleApi } from "../lib/vehicleApi";
import { companyLogoUrl, photoUrl } from "../lib/vehicleMapper";
import type { VehicleDto } from "../types/vehicle";
import { ApiError } from "../lib/apiClient";

const companyName = (vehicle: VehicleDto) =>
  typeof vehicle.companyId === "object" && vehicle.companyId
    ? vehicle.companyId.name
    : "NexRide";

export const VehicleComparisonPage = () => {
  const { t } = useTranslation();
  const { vehicleIds, removeVehicle, clearVehicles } = useVehicleComparison();
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    if (vehicleIds.length === 0) {
      setVehicles([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled(vehicleIds.map((id) => vehicleApi.getById(id, signal)));
      if (signal?.aborted) return;
      const byId = new Map<string, VehicleDto>();
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          byId.set(result.value.data.vehicle._id, result.value.data.vehicle);
          return;
        }
        if (result.reason instanceof ApiError && result.reason.status === 404) {
          removeVehicle(vehicleIds[index]);
          return;
        }
        throw result.reason;
      });
      setVehicles(vehicleIds.map((id) => byId.get(id)).filter((vehicle): vehicle is VehicleDto => Boolean(vehicle)));
    } catch (loadError) {
      if ((loadError as { name?: string })?.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : t("comparison.loadError"));
    } finally {
      setLoading(false);
    }
  }, [removeVehicle, t, vehicleIds]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => load(controller.signal));
    return () => controller.abort();
  }, [load]);

  const rows = [
    [t("comparison.dailyPrice"), (v: VehicleDto) => `${v.dailyPrice.toLocaleString()} LYD`],
    [t("comparison.type"), (v: VehicleDto) => t(`fleet.types.${v.type}`)],
    [t("comparison.year"), (v: VehicleDto) => String(v.year)],
    [t("comparison.transmission"), (v: VehicleDto) => t(`fleet.transmissions.${v.transmission}`)],
    [t("comparison.fuel"), (v: VehicleDto) => t(`fleet.fuelTypes.${v.fuelType}`)],
    [t("comparison.seats"), (v: VehicleDto) => String(v.seats)],
    [t("comparison.doors"), (v: VehicleDto) => String(v.doors)],
    [t("comparison.city"), (v: VehicleDto) => v.city],
    [t("comparison.pickup"), (v: VehicleDto) => v.pickupLocation],
    [t("comparison.rating"), (v: VehicleDto) => `${v.ratingsAverage.toFixed(1)} / 5 (${v.ratingsQuantity})`],
    [t("comparison.operator"), companyName],
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-32 pt-28 lg:px-8">
      <div className="mx-auto max-w-[1280px]">
        <Link to="/fleet" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-700"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{t("comparison.back")}</Link>
        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-black uppercase tracking-[.18em] text-blue-600">{t("comparison.eyebrow")}</span>
            <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">{t("comparison.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{t("comparison.description")}</p>
          </div>
          {vehicleIds.length > 0 && <button type="button" onClick={clearVehicles} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" />{t("comparison.clear")}</button>}
        </div>

        {loading ? (
          <div className="grid min-h-80 place-items-center" role="status"><LoaderCircle className="h-9 w-9 animate-spin text-blue-600" /></div>
        ) : error ? (
          <div className="mt-10 rounded-3xl border border-red-200 bg-white p-10 text-center"><p className="font-bold text-red-700">{error}</p><button type="button" onClick={() => void load()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#142B4A] px-5 py-2.5 text-sm font-bold text-white"><RefreshCw className="h-4 w-4" />{t("common.retry")}</button></div>
        ) : vehicles.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><GitCompareArrows className="mx-auto h-10 w-10 text-slate-400" /><h2 className="mt-4 text-xl font-black text-slate-900">{t("comparison.emptyTitle")}</h2><p className="mt-2 text-sm text-slate-500">{t("comparison.emptyDescription")}</p><Link to="/fleet" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">{t("comparison.browse")}</Link></div>
        ) : (
          <div className="mt-10 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[760px] table-fixed border-collapse">
              <thead>
                <tr>
                  <th className="w-44 border-b border-e border-slate-200 bg-slate-50 p-5 text-start text-xs font-black uppercase tracking-wider text-slate-500">{t("comparison.vehicle")}</th>
                  {vehicles.map((vehicle) => {
                    const logo = typeof vehicle.companyId === "object" && vehicle.companyId ? companyLogoUrl(vehicle.companyId.logo) : null;
                    return <th key={vehicle._id} className="relative border-b border-e border-slate-200 p-5 align-top last:border-e-0"><button type="button" onClick={() => removeVehicle(vehicle._id)} aria-label={t("comparison.remove", { vehicle: `${vehicle.make} ${vehicle.model}` })} className="absolute end-3 top-3 rounded-full bg-white/90 p-2 text-slate-500 shadow hover:text-rose-600"><X className="h-4 w-4" /></button><img src={photoUrl(vehicle.photos?.[0])} alt={`${vehicle.make} ${vehicle.model}`} className="h-36 w-full rounded-2xl object-cover" /><div className="mt-4 text-start"><h2 className="text-lg font-black text-slate-950">{vehicle.make} {vehicle.model}</h2><div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">{logo && <img src={logo} alt="" className="h-6 w-6 rounded-full object-cover" />}{companyName(vehicle)}</div><Link to={`/cars/${vehicle._id}`} className="mt-4 inline-flex rounded-xl bg-[#142B4A] px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">{t("comparison.viewVehicle")}</Link></div></th>;
                  })}
                </tr>
              </thead>
              <tbody>{rows.map(([label, value]) => <tr key={label} className="border-b border-slate-100 last:border-0"><th className="border-e border-slate-200 bg-slate-50 p-4 text-start text-xs font-bold text-slate-600">{label}</th>{vehicles.map((vehicle) => <td key={vehicle._id} className="border-e border-slate-100 p-4 text-sm font-semibold text-slate-800 last:border-e-0">{value(vehicle)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleComparisonPage;
