import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CarSimple,
  CurrencyCircleDollar,
  SealCheck,
} from "@phosphor-icons/react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import Tilt from "react-parallax-tilt";

const HeroLine = ({ text, accent = false }: { text: string; accent?: boolean }) => (
  <span className={`block ${accent ? "text-blue-600" : ""}`}>
    {text.split(/\s+/).map((word, index) => (
      <span key={`${word}-${index}`} data-hero-word style={{ opacity: 0 }} className="inline-block will-change-[transform,opacity] [backface-visibility:hidden]">
        {word}{index < text.split(/\s+/).length - 1 ? "\u00a0" : ""}
      </span>
    ))}
  </span>
);

export const HeroHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl flex flex-col items-start relative z-10">
      <h1
        className="font-extrabold text-4xl sm:text-5xl lg:text-[56px] tracking-tight leading-[1.08] text-slate-900"
      >
        <HeroLine text={t("home.hero.line1")} />
        <HeroLine text={t("home.hero.line2")} />
        <HeroLine text={t("home.hero.line3")} />
        <HeroLine text={t("home.hero.line4")} accent />
      </h1>

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
        <motion.div whileHover={{ scale: 1.045 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Link
            to="/FleetPage"
            className="group flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-shadow hover:bg-blue-700 hover:shadow-[0_12px_34px_rgba(37,99,235,0.42)]"
          >
            <span>{t("home.hero.browseCars")}</span>
            <ArrowRight weight="bold" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5 rtl:rotate-180 rtl:group-hover:-translate-x-1.5" />
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
        <Tilt tiltMaxAngleX={8} tiltMaxAngleY={8} scale={1.02} transitionSpeed={1000} glareEnable glareMaxOpacity={0.12} glareColor="#ffffff" glareBorderRadius="14px" className="flex items-center gap-2 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
            <CarSimple weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs">10,000+</div>
            <div className="text-[10px] text-slate-500">
              {t("home.hero.carsListed")}
            </div>
          </div>
        </Tilt>

        <Tilt tiltMaxAngleX={8} tiltMaxAngleY={8} scale={1.02} transitionSpeed={1000} glareEnable glareMaxOpacity={0.12} glareColor="#ffffff" glareBorderRadius="14px" className="flex items-center gap-2 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
            <SealCheck weight="fill" className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs">
              {t("home.hero.trustedSellers")}
            </div>
            <div className="text-[10px] text-slate-500">
              {t("home.hero.verifiedReviewed")}
            </div>
          </div>
        </Tilt>

        <Tilt tiltMaxAngleX={8} tiltMaxAngleY={8} scale={1.02} transitionSpeed={1000} glareEnable glareMaxOpacity={0.12} glareColor="#ffffff" glareBorderRadius="14px" className="flex items-center gap-2 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-amber-50 ring-1 ring-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
            <CurrencyCircleDollar weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs">
              {t("home.hero.bestPrices")}
            </div>
            <div className="text-[10px] text-slate-500">
              {t("home.hero.marketCompetitive")}
            </div>
          </div>
        </Tilt>
      </motion.div>
    </div>
  );
};

export default HeroHeader;
