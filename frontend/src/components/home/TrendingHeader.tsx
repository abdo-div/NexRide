import React from "react";

interface TrendingHeaderProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
}

export const TrendingHeader: React.FC<TrendingHeaderProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
      <div>
        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block mb-1">
          HANDPICKED EXCELLENCE
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          TRENDING RENTALS IN LIBYA
        </h2>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onSelectCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
              activeCategory === cat
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
};
