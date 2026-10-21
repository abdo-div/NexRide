import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CarSimple,
  Jeep,
  Lightning,
  Mountains,
  Sparkle,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router";
import type { VehicleCategory } from "../../types/category";
import { cardHover, hoverSpring } from "../../lib/motion";

interface CategoryCardProps {
  category: VehicleCategory;
  index?: number;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, index = 0 }) => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const iconClass = "h-6 w-6 transition-colors duration-300 group-hover:text-white";
  const renderIcon = () => {
    if (category.id === "executive-suv") {
      return <Jeep weight="duotone" className={iconClass} />;
    }

    switch (category.iconName) {
      case "star":
        return <Sparkle weight="duotone" className={iconClass} />;
      case "mountain":
        return <Mountains weight="duotone" className={iconClass} />;
      case "zap":
        return <Lightning weight="duotone" className={iconClass} />;
      default:
        return <CarSimple weight="duotone" className={iconClass} />;
    }
  };

  const iconTheme = "bg-slate-50 border-slate-200 text-[#142b4a]";
  const imageByCategory: Record<string, string> = {
    economy: "/nexride-hero-coast-v3.png",
    "executive-suv": "/nexride-hero-mountain-v5.png",
    "ultra-luxury": "/nexride-hero-sunset-v2.png",
    "desert-4x4": "/3carsUpdated.png",
    "electric-hybrid": "/nexride-hero-marina-v4.png",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
      whileHover={reduceMotion ? undefined : cardHover}
      className="premium-card bg-white/90 rounded-2xl border border-slate-200/80 group"
    >
      <Link
        to={`/fleet?category=${encodeURIComponent(category.id)}`}
        aria-label={`${t("home.categories.explore")} ${t(category.title)}`}
        className="flex min-h-full flex-col justify-between overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      >
      <div>
        <div className="relative h-32 overflow-hidden bg-slate-100">
          <img src={imageByCategory[category.id]} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 to-transparent" />
        </div>
        <div className="p-4 pb-0">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div
            className={`w-11 h-11 rounded-xl border flex items-center justify-center shadow-sm group-hover:bg-[#142b4a] group-hover:border-[#142b4a] group-hover:text-white transition-colors duration-300 ${iconTheme}`}
          >
            {renderIcon()}
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            <strong className="text-slate-700">
              {category.availableCount}
            </strong>{" "}
            {t("home.categories.available")}
          </span>
        </div>

        <h3 className="font-extrabold text-base text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
          {t(category.title)}
        </h3>
        </div>
      </div>

      {/* Pricing & Arrow Link */}
      <div className="mx-4 mt-4 flex items-center justify-between border-t border-slate-100/80 pb-4 pt-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
            {t("home.categories.startingFrom")}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-blue-600">
              {category.startingPrice === null
                ? "—"
                : category.startingPrice.toLocaleString()}
            </span>
            {category.startingPrice !== null && (
              <span className="text-xs font-bold text-slate-700">
                {category.currency}
              </span>
            )}
          </div>
        </div>

        <motion.span
          aria-hidden="true"
          className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-[#142b4a] group-hover:border-[#142b4a] transition-all duration-200"
          whileHover={reduceMotion ? undefined : { scale: 1.1 }}
          transition={hoverSpring}
        >
          <ArrowRight weight="bold" className="w-4 h-4 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5 transition-transform" />
        </motion.span>
      </div>
      </Link>
    </motion.div>
  );
};

export default CategoryCard;
