import React from "react";
import { useTranslation } from "react-i18next";
import { MagnifyingGlass as Search, Scales as Scale, LockKey as Lock, Key } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import type { HowItWorksStep } from "../../types/step";

interface StepCardProps {
  step: HowItWorksStep;
  index?: number;
}

export const StepCard: React.FC<StepCardProps> = ({ step, index = 0 }) => {
  const { t } = useTranslation();
  const renderIcon = () => {
    switch (step.iconType) {
      case "search":
        return <Search className="w-4 h-4 text-blue-600" />;
      case "compare":
        return <Scale className="w-4 h-4 text-blue-600" />;
      case "reserve":
        return <Lock className="w-4 h-4 text-blue-600" />;
      case "drive":
        return <Key className="w-4 h-4 text-emerald-500" />;
      default:
        return <Search className="w-4 h-4 text-blue-600" />;
    }
  };

  const isDriveStep = step.iconType === "drive";

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="bg-white rounded-3xl border border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-xl hover:shadow-blue-500/5 transition-shadow duration-300 group hover:border-blue-200"
    >
      <div>
        {/* Header Row: Icon Box & Step Number */}
        <div className="flex items-center justify-between mb-6">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-110 ${
              isDriveStep
                ? "bg-emerald-50/80 border-emerald-100"
                : "bg-blue-50/80 border-blue-100"
            }`}
          >
            {renderIcon()}
          </div>

          <span className="text-3xl font-black text-slate-200 group-hover:text-blue-500/30 transition-colors tracking-tight">
            {step.stepNumber}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="font-black text-base text-slate-900 tracking-tight uppercase mb-3 group-hover:text-blue-600 transition-colors">
          {t(step.title)}
        </h3>
        <p className="text-xs text-slate-500 font-medium leading-relaxed min-h-[72px]">
          {t(step.description)}
        </p>
      </div>

      {/* Footer Tagline */}
      <div className="pt-6 mt-6 border-t border-slate-100/80">
        <span
          className={`text-[11px] font-bold ${
            isDriveStep ? "text-emerald-600" : "text-blue-600"
          }`}
        >
          {t(step.footerText)}
        </span>
      </div>
    </motion.div>
  );
};

export default StepCard;
