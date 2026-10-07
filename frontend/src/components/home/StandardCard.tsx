import React from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Building2, CreditCard, Car } from "lucide-react";
import { motion } from "framer-motion";
import type { StandardFeature } from "../../types/standard";

interface StandardCardProps {
  feature: StandardFeature;
  index?: number;
}

export const StandardCard: React.FC<StandardCardProps> = ({ feature, index = 0 }) => {
  const { t } = useTranslation();
  const renderIcon = () => {
    switch (feature.iconType) {
      case "shield":
        return <ShieldCheck className="w-5 h-5 text-blue-600" />;
      case "building":
        return <Building2 className="w-5 h-5 text-blue-600" />;
      case "credit-card":
        return <CreditCard className="w-5 h-5 text-blue-600" />;
      case "car":
        return <Car className="w-5 h-5 text-rose-500" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="bg-slate-50/70 hover:bg-white rounded-3xl border border-slate-200/80 p-6 flex flex-col justify-between transition-colors duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 group"
    >
      <div>
        {/* Icon Box */}
        <div className="w-11 h-11 rounded-2xl bg-blue-100/60 border border-blue-200/50 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
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
