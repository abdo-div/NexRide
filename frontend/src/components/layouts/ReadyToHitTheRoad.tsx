import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Phone } from "lucide-react";
import { motion } from "framer-motion";

export const ReadyToHitTheRoad: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 px-6 lg:px-12 text-center border-b border-slate-900 bg-gradient-to-b from-[#020617] via-[#080e21] to-[#020617] relative overflow-hidden">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.12, 0.22, 0.12],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600 blur-[120px] rounded-full pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7 }}
        className="max-w-3xl mx-auto relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/60 text-[11px] font-bold text-blue-400 mb-6">
          <span>❖</span>
          <span>{t("cta.badge")}</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-black tracking-tight uppercase leading-[1.05] mb-6 text-white">
          {t("cta.heading")}
        </h2>

        <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed mb-8 max-w-xl mx-auto">
          {t("cta.subtitle")}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <a
              href="#featured-fleet"
              className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/25 flex items-center gap-2 transition-all"
            >
              <span>{t("cta.exploreVehicles")}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </a>
          </motion.div>

          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <a
              href="#contact"
              className="px-6 py-3.5 rounded-2xl bg-[#0b1220] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-extrabold text-xs flex items-center gap-2 transition-all"
            >
              <span>{t("cta.contactConcierge")}</span>
              <Phone className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default ReadyToHitTheRoad;