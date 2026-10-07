import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import type { RegionHub } from "../../types/region";

interface RegionCardProps {
  hub: RegionHub;
  index?: number;
}

export const RegionCard: React.FC<RegionCardProps> = ({ hub, index = 0 }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="bg-[#0b1329]/90 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-6 flex flex-col justify-between transition-colors duration-300 group"
    >
      <div>
        {/* Card Header Badges */}
        <div className="flex items-center justify-between text-xs mb-4">
          <span className="px-2.5 py-1 rounded-full bg-blue-950/80 border border-blue-800/50 text-blue-400 font-bold text-[11px]">
            {t(hub.badge)}
          </span>
          <span className="text-slate-500 font-bold tracking-wider text-[11px]">
            {hub.code}
          </span>
        </div>

        {/* City Name & Subtitle */}
        <h3 className="text-xl font-black text-white tracking-tight uppercase mb-1 group-hover:text-cyan-400 transition-colors">
          {hub.cityName}
        </h3>
        <p className="text-xs text-slate-400 font-medium leading-relaxed min-h-[36px]">
          {t(hub.subtitle)}
        </p>
      </div>

      {/* Availability & Bullet Features */}
      <div className="mt-6 pt-4 border-t border-slate-800/80">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-bold text-white">
            {hub.vehiclesAvailable} {t("home.nationwide.vehiclesAvailable")}
          </span>
        </div>

        <ul className="space-y-1.5">
          {hub.features.map((feature, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 text-xs text-slate-400"
            >
              <span className="text-slate-600">•</span>
              <span>{t(feature)}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
};

export default RegionCard;
