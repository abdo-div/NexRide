import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Star, ArrowRight } from "lucide-react";
import type { CompanyProfileVehicle } from "../../types/companyProfile";

interface CompanyProfileVehicleCardProps {
  vehicle: CompanyProfileVehicle;
}

/**
 * Fleet card on the public company profile. Renders only real data from the
 * operator's currently available vehicles; the instant-booking badge is honest
 * because every listed unit is already PUBLISHED + AVAILABLE.
 */
export const CompanyProfileVehicleCard: React.FC<
  CompanyProfileVehicleCardProps
> = ({ vehicle }) => {
  const { t } = useTranslation();

  const specs = [
    t(`fleet.transmissions.${vehicle.transmission}`, vehicle.transmission),
    t(`fleet.fuelTypes.${vehicle.fuelType}`, vehicle.fuelType),
    `${vehicle.seats} ${t("fleet.seatsUnit", "Seats")}`,
    vehicle.doors > 0 ? `${vehicle.doors} ${t("companyProfile.doorsUnit")}` : "",
  ].filter(Boolean);

  return (
    <article className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col overflow-hidden group">
      <div className="relative w-full aspect-[16/10] bg-slate-100 overflow-hidden">
        <img
          src={vehicle.image}
          alt={vehicle.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-emerald-700 shadow-sm flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {t("companyProfile.instantConfirmation")}
          </span>
          {vehicle.pickupLocation && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#2563EB] text-white shadow-sm max-w-[220px] truncate">
              {vehicle.pickupLocation}
            </span>
          )}
        </div>
        <span className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-0.5 rounded-lg text-[11px] font-bold">
          {t("companyProfile.yearBadge", { year: vehicle.year })}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1 justify-between gap-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                {vehicle.typeLabel}
              </span>
              <h3 className="text-[16px] font-extrabold text-slate-900 truncate">
                {vehicle.title}
              </h3>
            </div>
            <div className="flex items-center gap-1 text-amber-500 font-bold text-[12px] shrink-0 pt-0.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{vehicle.rating.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {specs.map((spec) => (
              <span
                key={spec}
                className="px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-[11px] font-semibold"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100">
          <div className="flex items-baseline gap-1">
            <span className="text-[24px] font-extrabold text-[#2563EB] tabular-nums">
              {vehicle.dailyPrice}
            </span>
            <span className="text-[12px] font-bold text-slate-700">
              {t("companyProfile.currency")}{" "}
              <span className="font-normal text-slate-400">
                {t("companyProfile.perDay")}
              </span>
            </span>
          </div>
          <Link
            to={vehicle.href}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-[13px] font-bold shadow-sm transition-colors flex-shrink-0"
          >
            {t("companyProfile.viewDetails")}
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </article>
  );
};

/** Pulse-only placeholder used while the profile fleet is loading. */
export const CompanyProfileVehicleSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col gap-4 animate-pulse overflow-hidden">
    <div className="w-full aspect-[16/10] bg-slate-200 rounded-xl" />
    <div className="h-5 bg-slate-200 rounded w-3/4" />
    <div className="h-4 bg-slate-100 rounded w-1/2" />
    <div className="flex flex-wrap gap-1.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-6 w-20 bg-slate-100 rounded-md" />
      ))}
    </div>
    <div className="h-10 bg-slate-200 rounded-xl mt-2" />
  </div>
);

export default CompanyProfileVehicleCard;