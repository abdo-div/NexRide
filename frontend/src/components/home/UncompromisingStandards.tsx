import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { StandardCard } from "./StandardCard";
import { STANDARDS_DATA } from "../../data/standardData";

export const UncompromisingStandards: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section className="relative w-full overflow-hidden border-b border-slate-100 bg-[#f4f8fc] px-6 py-12 lg:px-12">
      <img src="/nexride-hero-mountain-v5.png" alt="" className="absolute inset-y-0 end-0 hidden h-full w-1/2 object-cover lg:block" />
      <div className="absolute inset-y-0 end-0 hidden w-[58%] bg-gradient-to-r from-[#f4f8fc] via-[#f4f8fc]/70 to-transparent rtl:bg-gradient-to-l lg:block" />
      <div className="relative z-10 max-w-7xl mx-auto lg:pe-[48%]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="mb-7 max-w-2xl text-start"
      >
        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block mb-2">
          {t("home.standards.eyebrow")}
        </span>
        <h2 className="mb-2 text-3xl font-black tracking-tight text-slate-900">
          {t("home.standards.title")}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
          {t("home.standards.subtitle")}
        </p>
      </motion.div>

      {/* Standards Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STANDARDS_DATA.map((feature, index) => (
          <StandardCard key={feature.id} feature={feature} index={index} />
        ))}
      </div>
      </div>
    </section>
  );
};

export default UncompromisingStandards;
