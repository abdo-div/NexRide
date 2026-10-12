import React from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  Buildings as Building2,
  CreditCard,
  CarSimple,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import type { StandardFeature } from "../../types/standard";

interface StandardCardProps {
  feature: StandardFeature;
  index?: number;
}

export const StandardCard: React.FC<StandardCardProps> = ({ feature, index = 0 }) => {
  const { t } = useTranslation();
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
      className="premium-card bg-slate-50/70 hover:bg-white rounded-3xl border border-slate-200/80 p-6 flex flex-col justify-between group"
    >
      <div>
        {/* Icon Box */}
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-[#142b4a] shadow-sm flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-[#142b4a] group-hover:border-[#142b4a] group-hover:text-white transition-all duration-300">
          {renderIcon()}
        </div>

        {/* Title */}
        <h3 className="font-black text-lg text-slate-900 tracking-tight mb-3 group-hover:text-blue-600 transition-colors">
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
