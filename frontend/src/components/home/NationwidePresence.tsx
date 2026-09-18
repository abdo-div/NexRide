import React from "react";
import { RegionCard } from "./RegionCard";
import { RegionFeaturesBanner } from "./RegionFeaturesBanner";
import { REGION_HUBS } from "../../data/regionData";

export const NationwidePresence: React.FC = () => {
  return (
    <section className="w-full py-20 px-6 lg:px-12 bg-[#030712] text-white border-b border-slate-900">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest block mb-2">
          NATIONWIDE FLEET PRESENCE
        </span>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase mb-4">
          COVERING ALL MAJOR REGIONS IN LIBYA
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 font-medium">
          Seamless pickup and VIP airport tarmac handovers across Libya's
          primary commercial corridors.
        </p>
      </div>

      {/* Region Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REGION_HUBS.map((hub) => (
          <RegionCard key={hub.id} hub={hub} />
        ))}
      </div>

      {/* Bottom Features Banner */}
      <RegionFeaturesBanner />
    </section>
  );
};
