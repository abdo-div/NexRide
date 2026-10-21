import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { CategoryCard } from "./CategoryCard";
import { HomeSectionError } from "./HomeSectionError";
import type { VehicleCategory } from "../../types/category";

interface VehicleCategoriesProps {
  categories: VehicleCategory[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const VehicleCategories: React.FC<VehicleCategoriesProps> = ({
  categories,
  loading,
  error,
  onRetry,
}) => {
  const { t } = useTranslation();
  const showError = error !== null && !loading;

  return (
    <section className="w-full overflow-hidden border-b border-slate-100 bg-[#f8fbff] px-6 py-12 lg:px-12">
      <div className="mx-auto max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"
      >
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-2">
            {t("home.categories.eyebrow")}
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {t("home.categories.title")}
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm leading-relaxed">
          {t("home.categories.subtitle")}
        </p>
      </motion.div>

      {/* Categories Grid */}
      {loading ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
          role="status"
          aria-busy="true"
          aria-label={t("common.loading", { defaultValue: "Loading categories" })}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="skeleton-shimmer h-[185px] rounded-2xl border border-slate-200/80"
            />
          ))}
        </div>
      ) : showError ? (
        <HomeSectionError onRetry={onRetry} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {categories.map((category, index) => (
            <CategoryCard key={category.id} category={category} index={index} />
          ))}
        </div>
      )}
      </div>
    </section>
  );
};

export default VehicleCategories;
