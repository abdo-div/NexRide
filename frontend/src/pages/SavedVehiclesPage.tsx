import React from "react";
import { Heart, History, LoaderCircle } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { VehicleCard } from "../components/vehicles/VehicleCard";
import { useSavedVehicles } from "../context/useSavedVehicles";
import { mapVehicles } from "../lib/vehicleMapper";

export const SavedVehiclesPage: React.FC = () => {
  const { t } = useTranslation();
  const { favorites, recentlyViewed, loading } = useSavedVehicles();
  const saved = mapVehicles(favorites, (key, fallback) => t(key, { defaultValue: fallback }));
  const recent = mapVehicles(recentlyViewed, (key, fallback) => t(key, { defaultValue: fallback }));

  const section = (title: string, description: string, icon: React.ReactNode, vehicles: typeof saved) => (
    <section className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">{icon}</span>
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {vehicles.length > 0 ? (
        <div className="flex flex-col gap-6">{vehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}</div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-600">{t("savedVehicles.empty")}</p>
          <Link to="/fleet" className="mt-4 inline-flex rounded-xl bg-[#142B4A] px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">{t("savedVehicles.browse")}</Link>
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-20 pt-28 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        <span className="text-xs font-black uppercase tracking-[.18em] text-blue-600">{t("savedVehicles.eyebrow")}</span>
        <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">{t("savedVehicles.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{t("savedVehicles.description")}</p>
        {loading ? (
          <div className="grid min-h-64 place-items-center" role="status"><LoaderCircle className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : (
          <div className="mt-10 space-y-14">
            {section(t("savedVehicles.favorites"), t("savedVehicles.favoritesDescription"), <Heart className="h-5 w-5" />, saved)}
            {section(t("savedVehicles.recent"), t("savedVehicles.recentDescription"), <History className="h-5 w-5" />, recent)}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedVehiclesPage;
