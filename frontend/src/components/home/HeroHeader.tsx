import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, ShieldCheck, Car, Tag } from "lucide-react";
import { Link } from "react-router";
import { motion } from "framer-motion";

export const HeroHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl flex flex-col items-start relative z-10">
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="font-extrabold text-4xl sm:text-5xl lg:text-[56px] tracking-tight leading-[1.08] text-slate-900"
      >
        {t("home.hero.line1")} <br />
        {t("home.hero.line2")} <br />
        {t("home.hero.line3")} <br />
        <span className="text-blue-600">{t("home.hero.line4")}</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        className="mt-4 text-sm sm:text-base text-slate-600 max-w-lg leading-relaxed font-medium"
      >
        {t("home.hero.subtitle")}
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        className="mt-6 flex flex-wrap items-center gap-3"
      >
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link
            to="/FleetPage"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <span>{t("home.hero.browseCars")}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link
            to="/partner/apply"
            className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-sm shadow-xs transition-all flex items-center gap-2"
          >
            <span>{t("home.hero.sellYourCar")}</span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Trust Badges Bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
        className="mt-8 flex items-center gap-6 text-xs text-slate-600 font-medium"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-xs">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs">10,000+</div>
            <div className="text-[10px] text-slate-500">
              {t("home.hero.carsListed")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs">
              {t("home.hero.trustedSellers")}
            </div>
            <div className="text-[10px] text-slate-500">
              {t("home.hero.verifiedReviewed")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-xs">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs">
              {t("home.hero.bestPrices")}
            </div>
            <div className="text-[10px] text-slate-500">
              {t("home.hero.marketCompetitive")}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HeroHeader;
