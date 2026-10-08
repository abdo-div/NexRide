import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { RegionCard } from "./RegionCard";
import { RegionFeaturesBanner } from "./RegionFeaturesBanner";
import { HomeSectionError } from "./HomeSectionError";
import type { RegionHub } from "../../types/region";

interface NationwidePresenceProps {
  hubs: RegionHub[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const NationwidePresence: React.FC<NationwidePresenceProps> = ({
  hubs,
  loading,
  error,
  onRetry,
}) => {
  const { t } = useTranslation();
  const showError = error !== null && !loading;

  return (
    <section id="locations" className="w-full py-20 px-6 lg:px-12 bg-[#030712] text-white border-b border-slate-900 overflow-hidden">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-3xl mx-auto mb-12"
      >
        <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest block mb-2">
          {t("home.nationwide.eyebrow")}
        </span>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase mb-4">
          {t("home.nationwide.title")}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 font-medium">
          {t("home.nationwide.subtitle")}
        </p>
      </motion.div>

      {/* Region Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-800 h-[220px] bg-slate-800/40 animate-pulse"
            />
          ))}
        </div>
      ) : showError ? (
        <HomeSectionError onRetry={onRetry} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {hubs.map((hub, index) => (
            <RegionCard key={hub.id} hub={hub} index={index} />
          ))}
        </div>
      )}

      {/* Bottom Features Banner */}
      <RegionFeaturesBanner />
    </section>
  );
};

export default NationwidePresence;