import React from "react";
import { SlidersHorizontal } from "lucide-react";

interface CategoryTabsProps {
  categories: string[];
  selectedFilter: string;
  onSelectCategory: (category: string) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  selectedFilter,
  onSelectCategory,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 overflow-x-auto pb-4 mb-8">
      <div className="flex items-center gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onSelectCategory(category)}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedFilter === category
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="hidden lg:flex items-center gap-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
        <span>More Filters</span>
      </button>
    </div>
  );
};
