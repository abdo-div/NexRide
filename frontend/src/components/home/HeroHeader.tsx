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
      <span key={`${word}-${index}`} className="inline-block">
        {word}{index < text.split(/\s+/).length - 1 ? "\u00a0" : ""}
      </span>
    ))}
  </span>
);

export const HeroHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="relative z-10 flex max-w-2xl flex-col items-start">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-100 shadow-lg shadow-slate-950/10 backdrop-blur-md"
      >
        <SealCheck weight="fill" className="h-4 w-4 text-blue-400" />
        {t("home.hero.trustedSellers")}
      </motion.div>
      <h1
        className="font-display text-4xl font-semibold leading-[1.01] tracking-[-0.045em] text-white drop-shadow-sm sm:text-5xl lg:text-[64px]"
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
        className="mt-5 max-w-xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base"
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
            to="/fleet"
            className="group flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-[0_16px_34px_-14px_rgba(37,99,235,.9)] transition-colors hover:bg-blue-500"
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
        className="mt-8 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-300 sm:gap-4"
      >
        <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.01} transitionSpeed={1000} glareEnable glareMaxOpacity={0.08} glareColor="#ffffff" glareBorderRadius="14px" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.07] p-2.5 pe-4 backdrop-blur-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300 ring-1 ring-blue-300/20">
            <CarSimple weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">{t("home.hero.carsListed")}</div>
            <div className="text-[10px] text-slate-400">
              {t("home.search.freeCancellation")}
            </div>
          </div>
        </Tilt>

        <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.01} transitionSpeed={1000} glareEnable glareMaxOpacity={0.08} glareColor="#ffffff" glareBorderRadius="14px" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.07] p-2.5 pe-4 backdrop-blur-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/20">
            <SealCheck weight="fill" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">
              {t("home.hero.trustedSellers")}
            </div>
            <div className="text-[10px] text-slate-400">
              {t("home.hero.verifiedReviewed")}
            </div>
          </div>
        </Tilt>

        <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.01} transitionSpeed={1000} glareEnable glareMaxOpacity={0.08} glareColor="#ffffff" glareBorderRadius="14px" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.07] p-2.5 pe-4 backdrop-blur-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/20">
            <CurrencyCircleDollar weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">
              {t("home.hero.bestPrices")}
            </div>
            <div className="text-[10px] text-slate-400">
              {t("home.hero.marketCompetitive")}
            </div>
          </div>
        </Tilt>
      </motion.div>
    </div>
  );
};

export default HeroHeader;
