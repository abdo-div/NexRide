import React from "react";
import { CategoryCard } from "./CategoryCard";
import { CATEGORIES_DATA } from "../../data/categoriesData";

export const VehicleCategories: React.FC = () => {
  return (
    <section className="w-full py-16 px-6 lg:px-12 bg-white border-b border-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-2">
            DISTINCTION & FLEET SPEC
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            EXPLORE BY VEHICLE CATEGORY
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm leading-relaxed">
          Curated luxury, rugged desert expedition, and efficient city cruisers
          across Libya.
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {CATEGORIES_DATA.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
};
