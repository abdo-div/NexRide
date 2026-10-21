import React from "react";
import { useTranslation } from "react-i18next";
import { SealCheck } from "@phosphor-icons/react";
import { motion } from "framer-motion";

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
    <div className="relative z-10 flex max-w-[650px] flex-col items-start pb-5 lg:pb-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-blue-100"
      >
        <SealCheck weight="fill" className="h-4 w-4 text-blue-400" />
        {t("home.hero.trustedSellers")}
      </motion.div>
      <h1
        className="font-display text-[42px] font-semibold leading-[1.02] tracking-[-0.045em] text-white drop-shadow-sm sm:text-[54px] lg:text-[62px] rtl:leading-[1.12]"
      >
        <HeroLine text={`${t("home.hero.line1")} ${t("home.hero.line2")}`} />
        <HeroLine text={`${t("home.hero.line3")} ${t("home.hero.line4")}`} accent />
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-100 sm:text-base"
      >
        {t("home.hero.subtitle")}
      </motion.p>

    </div>
  );
};

export default HeroHeader;
