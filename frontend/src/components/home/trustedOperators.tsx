import React from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
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
  const showError = error !== null && !loading;

  return (
    <section className="w-full py-20 px-6 lg:px-12 bg-slate-50/60 border-b border-slate-200/80">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
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
      </div>

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
      ) : operators.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm font-bold text-slate-700">
            {t("home.operators.empty.title")}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {t("home.operators.empty.desc")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {operators.map((operator) => (
            <OperatorCard key={operator.id} operator={operator} />
          ))}
        </div>
      )}
    </section>
  );
};