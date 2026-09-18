import React from "react";
import { Search, Scale, Lock, Key } from "lucide-react";
import type { HowItWorksStep } from "../../types/step";

interface StepCardProps {
  step: HowItWorksStep;
}

export const StepCard: React.FC<StepCardProps> = ({ step }) => {
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
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300 group">
      <div>
        {/* Header Row: Icon Box & Step Number */}
        <div className="flex items-center justify-between mb-6">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              isDriveStep
                ? "bg-emerald-50/80 border-emerald-100"
                : "bg-blue-50/80 border-blue-100"
            }`}
          >
            {renderIcon()}
          </div>

          <span className="text-3xl font-black text-slate-200 group-hover:text-slate-300 transition-colors tracking-tight">
            {step.stepNumber}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="font-black text-base text-slate-900 tracking-tight uppercase mb-3">
          {step.title}
        </h3>
        <p className="text-xs text-slate-500 font-medium leading-relaxed min-h-[72px]">
          {step.description}
        </p>
      </div>

      {/* Footer Tagline */}
      <div className="pt-6 mt-6 border-t border-slate-100/80">
        <span
          className={`text-[11px] font-bold ${
            isDriveStep ? "text-emerald-600" : "text-blue-600"
          }`}
        >
          {step.footerText}
        </span>
      </div>
    </div>
  );
};
