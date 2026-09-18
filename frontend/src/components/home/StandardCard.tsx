import React from "react";
import { ShieldCheck, Building2, CreditCard, Car } from "lucide-react";
import type { StandardFeature } from "../../types/standard";

interface StandardCardProps {
  feature: StandardFeature;
}

export const StandardCard: React.FC<StandardCardProps> = ({ feature }) => {
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
    <div className="bg-slate-50/70 hover:bg-white rounded-3xl border border-slate-200/80 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:border-slate-300 group">
      <div>
        {/* Icon Box */}
        <div className="w-11 h-11 rounded-2xl bg-blue-100/60 border border-blue-200/50 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
          {renderIcon()}
        </div>

        {/* Title */}
        <h3 className="font-black text-lg text-slate-900 tracking-tight mb-3 group-hover:text-blue-600 transition-colors">
          {feature.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          {feature.description}
        </p>
      </div>
    </div>
  );
};
