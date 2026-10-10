import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Heart, Star, ArrowRight } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import type { TrendingCar } from "../../types/trendingCar";
import { companyLogoUrl, initialsFrom } from "../../lib/vehicleMapper";

interface TrendingCardProps {
  car: TrendingCar;
  index?: number;
}

const SPEC_LABEL_KEYS: Record<string, string> = {
  TRANS: "data.trendingSpecs.trans",
  SEATS: "data.trendingSpecs.seats",
  POWER: "data.trendingSpecs.power",
  DRIVE: "data.trendingSpecs.drive",
  ENGINE: "data.trendingSpecs.engine",
  FUEL: "data.trendingSpecs.fuel",
};

const BADGE_KEYS: Record<string, string> = {
  "Instant Book": "home.trending.badges.instantBook",
  "Zero Deposit": "home.trending.badges.zeroDeposit",
  "Circuit Spec": "home.trending.badges.circuitSpec",
  "5.0 Rating": "home.trending.badges.fiveRating",
  "Sahara Ready": "home.trending.badges.saharaReady",
  "Satellite GPS": "home.trending.badges.satelliteGps",
  "Top Rated": "home.trending.badges.topRated",
  "Best Price": "home.trending.badges.bestPrice",
};

export const TrendingCard: React.FC<TrendingCardProps> = ({ car, index = 0 }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden hover:shadow-xl hover:shadow-blue-500/5 transition-shadow duration-300 group flex flex-col justify-between"
    >
      {/* Top Image Box */}
      <div className="relative w-full h-56 bg-slate-900 overflow-hidden">
        <img
          src={car.image}
          alt={car.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
        />

        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap max-w-[80%]">
          {car.badges.map((badge, idx) => (
            <span
              key={idx}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs backdrop-blur-md ${
                idx === 0
                  ? "bg-amber-500 text-white"
                  : "bg-slate-900/80 text-white border border-white/20"
              }`}
            >
              {BADGE_KEYS[badge] ? t(BADGE_KEYS[badge]) : badge}
            </span>
          ))}
        </div>

        {/* Saved Heart Button */}
        <button
          type="button"
          aria-label={t("data.common.saveCar")}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-700 hover:text-rose-500 hover:bg-white shadow-xs transition-colors cursor-pointer"
        >
          <Heart className="w-4 h-4" />
        </button>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Partner Company & Rating */}
          <div className="flex items-center justify-between gap-3 text-xs mb-2">
            <Link
              to={car.companyId ? `/companies/${car.companyId}` : "#"}
              className="flex min-w-0 items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
            >
              {companyLogoUrl(car.companyLogo) ? (
                <img
                  src={companyLogoUrl(car.companyLogo) ?? ""}
                  alt={car.companyName}
                  className="h-7 w-7 shrink-0 rounded-full border border-blue-100 object-cover"
                />
              ) : (
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-blue-100 bg-blue-50 text-[9px] font-black text-blue-600">
                  {initialsFrom(car.companyName)}
                </span>
              )}
              <span className="truncate">{car.companyName} • {car.location}</span>
            </Link>
            <div className="flex items-center gap-1 font-bold text-slate-700">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{car.rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">
                ({car.reviewCount})
              </span>
            </div>
          </div>

          {/* Car Name & Year */}
          <h3 className="font-extrabold text-lg text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
            {car.title} ({car.year})
          </h3>

          {/* Specifications Bar */}
          <div className="grid grid-cols-4 gap-1 py-3 my-3 bg-slate-50/80 rounded-xl px-2 text-center border border-slate-100">
            {car.specs.map((spec, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {SPEC_LABEL_KEYS[spec.label]
                    ? t(SPEC_LABEL_KEYS[spec.label])
                    : spec.label}
                </span>
                <span className="text-[11px] font-extrabold text-slate-700 mt-0.5">
                  {spec.valueKey ? t(spec.valueKey) : spec.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing & Reservation Button */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              {t("home.trending.dailyTariff")}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900">
                {car.dailyPrice.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-600">
                {car.currency}
              </span>
            </div>
          </div>

          <Link
            to={car.href ?? `/cars/${car.id}`}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <span>{t("home.trending.reserveRide")}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default TrendingCard;
