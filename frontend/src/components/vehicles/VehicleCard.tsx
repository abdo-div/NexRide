import React, { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Heart, Star, Gauge, Armchair, Settings, Fuel, CheckCircle2 } from "lucide-react";
import type { Vehicle } from "../../types/vehicle";
import { VehicleImage } from "../VehicleImage";
import { companyLogoUrl } from "../../lib/vehicleMapper";
import { motion, useReducedMotion } from "framer-motion";
import { buttonHover, buttonTap, hoverSpring, softHoverSpring } from "../../lib/motion";

const SPEC_META: {
  key: keyof Vehicle["specs"];
  labelKey: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "engine",
    labelKey: "fleet.card.specs.engine",
    icon: <Gauge className="w-[18px] h-[18px] text-slate-400" />,
  },
  {
    key: "seats",
    labelKey: "fleet.card.specs.capacity",
    icon: <Armchair className="w-[18px] h-[18px] text-slate-400" />,
  },
  {
    key: "gearbox",
    labelKey: "fleet.card.specs.gearbox",
    icon: <Settings className="w-[18px] h-[18px] text-slate-400" />,
  },
  {
    key: "fuel",
    labelKey: "fleet.card.specs.fuel",
    icon: <Fuel className="w-[18px] h-[18px] text-slate-400" />,
  },
];

export const VehicleCard: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
  const { t } = useTranslation();
  const [fav, setFav] = useState(!!vehicle.isFavorite);
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      whileHover={reduceMotion ? undefined : { y: -4, transition: softHoverSpring }}
      className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl overflow-hidden shadow-[0_12px_45px_-28px_rgba(15,23,42,.35)] hover:shadow-[0_24px_65px_-30px_rgba(15,23,42,.4)] hover:border-slate-300 transition-[border-color,box-shadow] flex flex-col xl:flex-row group"
    >
      <div className="xl:w-2/5 relative h-64 xl:h-auto overflow-hidden bg-slate-100">
        <VehicleImage
          src={vehicle.image}
          alt={vehicle.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-4 start-4 flex flex-col gap-1.5">
          {vehicle.isInstantConfirmation && (
            <span className="px-3 py-1 rounded-full bg-[#F97316] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              {t("fleet.filters.perks.instantConfirmation")}
            </span>
          )}
          {vehicle.isTopPick && (
            <span className="px-3 py-1 rounded-full bg-[#F97316]/95 backdrop-blur-md text-white border border-amber-500/70 text-[10px] font-bold uppercase tracking-wider shadow-sm">
              {t("fleet.card.topPick")}
            </span>
          )}
          {vehicle.badgeTag && !vehicle.isTopPick && (
            <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#0F172A] border border-[#E2E8F0] text-[10px] font-bold uppercase tracking-wider shadow-sm">
              {vehicle.badgeTag}
            </span>
          )}
          {vehicle.badgeTagSecondary && (
            <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#142B4A] border border-[#E2E8F0] text-[10px] font-bold uppercase tracking-wider shadow-sm">
              {vehicle.badgeTagSecondary}
            </span>
          )}
        </div>
        <motion.button
          type="button"
          onClick={() => setFav((f) => !f)}
          aria-label={t("fleet.card.toggleFavorite")}
          aria-pressed={fav}
          className="absolute top-4 end-4 p-2 rounded-full bg-white/90 backdrop-blur-md text-slate-600 hover:text-red-500 border border-[#E2E8F0] shadow-sm transition-colors"
          whileHover={reduceMotion ? undefined : { scale: 1.12, rotate: -7 }}
          whileTap={reduceMotion ? undefined : { scale: 0.88 }}
          transition={hoverSpring}
        >
          <Heart className={`w-[20px] h-[20px] ${fav ? "fill-red-500 text-red-500" : ""}`} />
        </motion.button>
      </div>

      <div className="xl:w-3/5 p-6 flex flex-col justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#142B4A]">
                {vehicle.category}
              </span>
              <h2 className="text-xl font-bold text-[#0F172A] mt-0.5">{vehicle.title}</h2>
            </div>
            <div className="text-end shrink-0">
              <div className="text-2xl font-bold text-[#0F172A] tracking-tight tabular-nums">
                {vehicle.pricePerDay.toLocaleString()} LYD
              </div>
              <span className="text-[11px] text-slate-500">
                {t("data.common.day")} · {vehicle.totalForPeriod.toLocaleString()} LYD{" "}
                {t("fleet.card.periodDays", { count: vehicle.periodDays })}
              </span>
            </div>
          </div>

          {/* Partner accreditation */}
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <Link
              to={vehicle.operator.id ? `/companies/${vehicle.operator.id}` : "#"}
              className="flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-[#142B4A]"
            >
              {companyLogoUrl(vehicle.operator.logo) ? <img src={companyLogoUrl(vehicle.operator.logo) ?? ""} alt={vehicle.operator.name} className="h-6 w-6 rounded-full border border-slate-200 object-cover" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[10px] font-bold text-[#142B4A]">{vehicle.operator.initials}</span>}
              <span>{vehicle.operator.name}</span>
            </Link>
            <span className="text-slate-300 text-xs">•</span>
            <div className="flex items-center text-[#F97316] text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-[#F97316] text-[#F97316] me-0.5" />
              {vehicle.operator.rating}{" "}
              {t("home.operators.reviews", { count: vehicle.operator.reviewsCount })}
            </div>
            {vehicle.operator.isVerified && (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-100 border border-[#E2E8F0] text-[10px] font-medium text-slate-600">
                {t("home.operators.verifiedPartner")}
              </span>
            )}
          </div>
        </div>

        {/* Specs grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 px-4 rounded-xl bg-slate-50 border border-[#E2E8F0]">
          {SPEC_META.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              {s.icon}
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-slate-500">{t(s.labelKey)}</span>
                <span className="text-[11px] font-bold text-[#0F172A]">
                  {vehicle.specs[s.key]}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Perks & CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[#E2E8F0]">
          <div className="flex flex-col gap-1">
            {vehicle.perks.map((perk, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-[#142B4A] shrink-0" />
                {perk}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <motion.div whileHover={reduceMotion ? undefined : buttonHover} whileTap={reduceMotion ? undefined : buttonTap}>
            <Link
              to={`/cars/${vehicle.id}`}
              className="px-4 py-2.5 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-sm"
            >
              {t("fleet.card.details")}
            </Link>
            </motion.div>
            <motion.div whileHover={reduceMotion ? undefined : buttonHover} whileTap={reduceMotion ? undefined : buttonTap}>
            <Link
              to={`/cars/${vehicle.id}`}
              className="px-6 py-2.5 rounded-xl bg-[#142B4A] text-white text-xs font-bold shadow-sm hover:bg-blue-700 active:scale-[0.99] transition-all inline-flex items-center"
            >
              {t("fleet.card.reserve", { total: vehicle.totalForPeriod.toLocaleString() })}
            </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.article>
  );
};
