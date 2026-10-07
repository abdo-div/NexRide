import React from "react";
import { useTranslation } from "react-i18next";
import { Star, ArrowRight, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import type { FleetOperator } from "../../types/operators";

interface OperatorCardProps {
  operator: FleetOperator;
  index?: number;
}

export const OperatorCard: React.FC<OperatorCardProps> = ({ operator, index = 0 }) => {
  const { t } = useTranslation();
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
        {/* Header: Logo Initials & Verified Badge */}
        <div className="flex items-center justify-between mb-5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm tracking-wider shadow-xs ${operator.avatarBg}`}
          >
            {operator.initials}
          </div>

          {operator.isVerified && (
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-600 font-bold text-[11px] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t("home.operators.verifiedPartner")}</span>
            </span>
          )}
        </div>

        {/* Agency Info */}
        <h3 className="font-black text-lg text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors mb-0.5">
          {operator.name}
        </h3>
        <p className="text-xs font-semibold text-slate-500 mb-2">
          {operator.locations}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-500 mb-6">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span>{operator.rating.toFixed(1)}</span>
          <span className="text-slate-400 font-normal">
            {t("home.operators.reviews", {
              count: operator.reviewsCount,
            })}
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="space-y-2.5 py-4 border-t border-slate-100 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">
              {t("home.operators.fleetSize")}
            </span>
            <span className="font-extrabold text-slate-900">
              {t("home.operators.vehiclesActive", {
                count: operator.fleetSize,
              })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">
              {t("home.operators.specialty")}
            </span>
            <span className="font-extrabold text-slate-900">
              {t(operator.specialty)}
            </span>
          </div>
        </div>
      </div>

      {/* View Agency Fleet Button */}
      <a
        href={`#operator-${operator.id}`}
        className="w-full mt-4 py-2.5 rounded-xl bg-slate-100/80 hover:bg-blue-600 hover:text-white text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors group/btn"
      >
        <span>{t("home.operators.viewFleet")}</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 rtl:rotate-180 rtl:group-hover/btn:-translate-x-1 transition-transform" />
      </a>
    </motion.div>
  );
};

export default OperatorCard;
