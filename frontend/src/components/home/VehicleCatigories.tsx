import React from "react";
import { useTranslation } from "react-i18next";
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
    <section className="w-full py-16 px-6 lg:px-12 bg-white border-b border-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-2">
            {t("home.categories.eyebrow")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t("home.categories.title")}
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm leading-relaxed">
          {t("home.categories.subtitle")}
        </p>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/80 h-[240px] bg-slate-100/70 animate-pulse"
            />
          ))}
        </div>
      ) : showError ? (
        <HomeSectionError onRetry={onRetry} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}
    </section>
  );
};