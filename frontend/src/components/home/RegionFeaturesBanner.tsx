import React from "react";
import { useTranslation } from "react-i18next";
import { Broadcast as Radio, ShieldCheck } from "@phosphor-icons/react";
import { REGION_FEATURES } from "../../data/regionData";

export const RegionFeaturesBanner: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="mt-8 bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-5 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      {REGION_FEATURES.map((item) => (
        <div key={item.id} className="flex items-start gap-3.5">
          {/* Custom Badge Icon */}
          <div className="shrink-0 mt-0.5">
            {item.iconType === "sos" && (
              <span className="px-2 py-1 rounded-md bg-cyan-950 border border-cyan-700/50 text-cyan-400 font-black text-[10px] tracking-wider">
                SOS
              </span>
            )}
            {item.iconType === "gps" && (
              <div className="p-1.5 rounded-lg bg-blue-950 border border-blue-800/50 text-blue-400">
                <Radio className="w-4 h-4" />
              </div>
            )}
            {item.iconType === "shield" && (
              <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-700/50 text-amber-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Feature Text */}
          <div>
            <h4 className="text-xs font-extrabold text-white tracking-wide uppercase mb-0.5">
              {t(item.title)}
            </h4>
            <p className="text-[11px] text-slate-400 leading-snug font-medium">
              {t(item.description)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
