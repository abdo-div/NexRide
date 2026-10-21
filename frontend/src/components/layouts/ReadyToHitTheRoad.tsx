import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ArrowRight, Building2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { buttonHover, buttonTap } from "../../lib/motion";

export const ReadyToHitTheRoad: React.FC = () => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-b border-slate-900 bg-[#071426] px-6 py-10 text-start lg:px-12">
      <img src="/3carsUpdated.png" alt="" className="absolute inset-0 h-full w-full object-cover object-[55%_58%] opacity-30" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,12,25,.98),rgba(3,12,25,.76),rgba(3,12,25,.94))]" />

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7 }}
        className="relative z-10 mx-auto max-w-7xl"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-800/60 bg-blue-950/80 px-3 py-1 text-[11px] font-bold text-blue-400">
          <Building2 className="size-3.5" />
          <span>{t("cta.partnerBadge")}</span>
        </div>

        <h2 className="mb-2 text-3xl font-black tracking-tight text-white">
          {t("cta.partnerHeading")}
        </h2>

        <p className="mb-5 max-w-xl text-xs font-medium leading-relaxed text-slate-300 sm:text-sm">
          {t("cta.partnerSubtitle")}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <motion.div
            whileHover={reduceMotion ? undefined : buttonHover}
            whileTap={reduceMotion ? undefined : buttonTap}
          >
            <Link
              to="/partner/apply"
              className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/25 flex items-center gap-2 transition-all"
            >
              <span>{t("cta.becomePartner")}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default ReadyToHitTheRoad;
