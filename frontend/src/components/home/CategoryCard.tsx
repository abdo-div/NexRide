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
import { motion } from "framer-motion";
import { Link } from "react-router";
import type { VehicleCategory } from "../../types/category";

interface CategoryCardProps {
  category: VehicleCategory;
  index?: number;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, index = 0 }) => {
  const { t } = useTranslation();
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

  const iconTheme =
    category.iconName === "star"
      ? "bg-violet-50 border-violet-100 text-violet-600"
      : category.iconName === "mountain"
        ? "bg-orange-50 border-orange-100 text-orange-600"
        : category.iconName === "zap"
          ? "bg-cyan-50 border-cyan-100 text-cyan-600"
          : "bg-blue-50 border-blue-100 text-blue-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="bg-white/80 rounded-2xl border border-slate-200/80 hover:shadow-xl hover:shadow-blue-500/5 transition-shadow duration-300 group hover:border-blue-200"
    >
      <Link
        to={`/fleet?category=${encodeURIComponent(category.id)}`}
        aria-label={`${t("home.categories.explore")} ${t(category.title)}`}
        className="p-5 flex min-h-full flex-col justify-between rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      >
      <div>
        {/* Badges Bar */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 border border-slate-200/60 shrink-0">
            {t(category.badge)}
          </span>
          <span className="text-[11px] font-semibold text-slate-400">
            <strong className="text-slate-700">
              {category.availableCount}
            </strong>{" "}
            {t("home.categories.available")}
          </span>
        </div>

        {/* Category Icon Wrapper */}
        <div
          className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all duration-300 ${iconTheme}`}
        >
          {renderIcon()}
        </div>

        {/* Title & Description */}
        <h3 className="font-extrabold text-base text-slate-900 tracking-tight mb-1.5 uppercase group-hover:text-blue-600 transition-colors">
          {t(category.title)}
        </h3>
        <p className="text-xs text-slate-500 font-medium leading-relaxed min-h-[36px]">
          {t(category.description)}
        </p>
      </div>

      {/* Pricing & Arrow Link */}
      <div className="pt-6 mt-6 border-t border-slate-100/80 flex items-center justify-between">
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

        <span
          aria-hidden="true"
          className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-200"
        >
          <ArrowRight weight="bold" className="w-4 h-4 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5 transition-transform" />
        </span>
      </div>
      </Link>
    </motion.div>
  );
};

export default CategoryCard;
