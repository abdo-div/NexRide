import React from "react";
import { useTranslation } from "react-i18next";
import { OperatorCard } from "./OperatorsCard";
import { OPERATORS_DATA } from "../../data/operatorsData";

export const TrustedOperators: React.FC = () => {
  const { t } = useTranslation();
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {OPERATORS_DATA.map((operator) => (
          <OperatorCard key={operator.id} operator={operator} />
        ))}
      </div>
    </section>
  );
};
