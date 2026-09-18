import React from "react";
import { ArrowRight } from "lucide-react";

export const FeaturedHeader: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
      <div>
        <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
          Explore Collection
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Featured Rental Vehicles
        </h2>
        <p className="mt-2 text-sm text-slate-600 font-medium max-w-xl">
          Choose from our top-rated, fully insured local fleet ready for
          immediate pickup across major Libyan cities.
        </p>
      </div>

      <a
        href="#all-cars"
        className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors group self-start md:self-auto"
      >
        <span>View All Vehicles</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </a>
    </div>
  );
};
