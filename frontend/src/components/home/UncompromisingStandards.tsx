import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { StandardCard } from "./StandardCard";
import { STANDARDS_DATA } from "../../data/standardData";

export const UncompromisingStandards: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section className="w-full py-20 px-6 lg:px-12 bg-white border-b border-slate-100 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl mx-auto mb-14"
      >
        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block mb-2">
          {t("home.standards.eyebrow")}
        </span>
        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight uppercase leading-[1.35] mb-4">
          {t("home.standards.title")}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
          {t("home.standards.subtitle")}
        </p>
      </motion.div>

      {/* Standards Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {STANDARDS_DATA.map((feature, index) => (
          <StandardCard key={feature.id} feature={feature} index={index} />
        ))}
      </div>
    </section>
  );
};

export default UncompromisingStandards;
