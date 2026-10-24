import React from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  Buildings as Building2,
  CreditCard,
  CarSimple,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import type { StandardFeature } from "../../types/standard";
import { cardHover } from "../../lib/motion";

interface StandardCardProps {
  feature: StandardFeature;
  index?: number;
}

export const StandardCard: React.FC<StandardCardProps> = ({ feature, index = 0 }) => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const iconClass = "h-6 w-6 transition-colors duration-300";
  const renderIcon = () => {
    switch (feature.iconType) {
      case "shield":
        return <ShieldCheck weight="duotone" className={iconClass} />;
      case "building":
        return <Building2 weight="duotone" className={iconClass} />;
      case "credit-card":
        return <CreditCard weight="duotone" className={iconClass} />;
      case "car":
        return <CarSimple weight="duotone" className={iconClass} />;
      default:
        return <ShieldCheck weight="duotone" className={iconClass} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      whileHover={reduceMotion ? undefined : cardHover}
      className="group flex flex-col justify-between rounded-2xl border border-transparent bg-transparent p-4 transition hover:border-slate-200 hover:bg-white"
    >
      <div>
        {/* Icon Box */}
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-blue-100 text-[#142b4a] shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:bg-[#142b4a] group-hover:text-white">
          {renderIcon()}
        </div>

        {/* Title */}
        <h3 className="mb-2 text-sm font-black tracking-tight text-slate-900 transition-colors group-hover:text-blue-600">
          {t(feature.title)}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          {t(feature.description)}
        </p>
      </div>
    </motion.div>
  );
};

export default StandardCard;
