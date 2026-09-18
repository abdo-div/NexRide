import React from "react";
import { ArrowRight, Car, Star, Mountain, Zap } from "lucide-react";
import type { VehicleCategory } from "../../types/category";

interface CategoryCardProps {
  category: VehicleCategory;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  const renderIcon = () => {
    switch (category.iconName) {
      case "star":
        return <Star className="w-5 h-5 text-amber-500 fill-amber-500/20" />;
      case "mountain":
        return <Mountain className="w-5 h-5 text-amber-600" />;
      case "zap":
        return <Zap className="w-5 h-5 text-cyan-500 fill-cyan-500/20" />;
      default:
        return <Car className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="bg-white/80 rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-300 group hover:border-slate-300">
      <div>
        {/* Badges Bar */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 border border-slate-200/60 shrink-0">
            {category.badge}
          </span>
          <span className="text-[11px] font-semibold text-slate-400">
            <strong className="text-slate-700">
              {category.availableCount}+
            </strong>{" "}
            Available
          </span>
        </div>

        {/* Category Icon Wrapper */}
        <div className="w-10 h-10 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-center mb-4">
          {renderIcon()}
        </div>

        {/* Title & Description */}
        <h3 className="font-extrabold text-base text-slate-900 tracking-tight mb-1.5 uppercase">
          {category.title}
        </h3>
        <p className="text-xs text-slate-500 font-medium leading-relaxed min-h-[36px]">
          {category.description}
        </p>
      </div>

      {/* Pricing & Arrow Link */}
      <div className="pt-6 mt-6 border-t border-slate-100/80 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
            STARTING FROM
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-blue-600">
              {category.startingPrice}
            </span>
            <span className="text-xs font-bold text-slate-700">
              {category.currency}
            </span>
          </div>
        </div>

        <a
          href={`#category-${category.id}`}
          aria-label={`Explore ${category.title}`}
          className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 group-hover:border-blue-200 transition-all"
        >
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>
    </div>
  );
};
