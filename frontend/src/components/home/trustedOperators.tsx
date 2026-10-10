import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { ArrowRight } from "@phosphor-icons/react";
import { OperatorCard } from "./OperatorsCard";
import { HomeSectionError } from "./HomeSectionError";
import type { FleetOperator } from "../../types/operators";

interface TrustedOperatorsProps {
  operators: FleetOperator[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const TrustedOperators: React.FC<TrustedOperatorsProps> = ({
  operators,
  loading,
  error,
  onRetry,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const showError = error !== null && !loading;
  const showAllVisible = !loading && !showError && operators.length > 4;
  const preview = operators.slice(0, 4);

  return (
    <section id="fleet-operators" className="w-full py-20 px-6 lg:px-12 bg-slate-50/60 border-b border-slate-200/80 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
      >
        <div>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block mb-2">
            {t("home.operators.eyebrow")}
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight uppercase">
            {t("home.operators.title")}
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm leading-relaxed">
          {t("home.operators.subtitle")}
        </p>
      </motion.div>

      {/* Operators Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-slate-200/80 h-[300px] bg-slate-200/60 animate-pulse"
            />
          ))}
        </div>
      ) : showError ? (
        <HomeSectionError onRetry={onRetry} />
      ) : (
        <div className="gap-5 flex flex-col">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {preview.map((operator, index) => (
              <OperatorCard key={operator.id} operator={operator} index={index} />
            ))}
          </div>
          {showAllVisible && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex justify-center"
            >
              <button
                type="button"
                onClick={() => navigate("/companies")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-[#2563EB] hover:text-[#2563EB] text-slate-800 text-sm font-bold transition-all"
              >
                <span>{t("home.operators.showAllCompanies")}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </motion.div>
          )}
        </div>
      )}
    </section>
  );
};

export default TrustedOperators;
