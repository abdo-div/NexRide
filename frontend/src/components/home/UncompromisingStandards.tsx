import React from "react";
import { StandardCard } from "./StandardCard";
import { STANDARDS_DATA } from "../../data/standardData";

export const UncompromisingStandards: React.FC = () => {
  return (
    <section className="w-full py-20 px-6 lg:px-12 bg-white border-b border-slate-100">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block mb-2">
          UNCOMPROMISING STANDARDS
        </span>
        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight uppercase mb-4">
          BUILT FOR CERTAINTY ACROSS LIBYA
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
          Enterprise-grade protections engineered for business travelers and
          fleet operators alike.
        </p>
      </div>

      {/* Standards Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {STANDARDS_DATA.map((feature) => (
          <StandardCard key={feature.id} feature={feature} />
        ))}
      </div>
    </section>
  );
};
