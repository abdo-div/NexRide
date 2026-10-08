import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Rocket, ArrowRight, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { PartnerDashboardMock } from "./PartnerDashboardMock";
import { PartnerMetrics } from "./PartnerMetrics";

export const PartnerSection: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section className="w-full py-20 px-6 lg:px-12 bg-[#020617] border-b border-slate-900 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Interactive UI Dashboard Mock */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6"
        >
          <PartnerDashboardMock />
        </motion.div>

        {/* Right Column: CTA Content */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6"
        >
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/60 text-[11px] font-bold text-blue-400 mb-6">
            <Rocket className="w-3.5 h-3.5 text-rose-500" />
            <span>{t("home.partners.badge")}</span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight uppercase leading-[1.1] mb-6">
            {t("home.partners.title")}
          </h2>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
            {t("home.partners.description")}
          </p>

          {/* Feature Cards Grid */}
          <PartnerMetrics />

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/partner/apply"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all"
              >
                <span>{t("home.partners.listYourFleet")}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/partner/apply"
                className="px-6 py-3.5 rounded-2xl bg-[#0b1220] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-extrabold text-xs flex items-center gap-2 transition-all"
              >
                <span>{t("home.partners.partnerGuidelines")}</span>
                <BookOpen className="w-4 h-4 text-slate-400" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PartnerSection;
