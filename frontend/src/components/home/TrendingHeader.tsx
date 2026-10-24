import React from "react";
import { useTranslation } from "react-i18next";

export const TrendingHeader: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="mb-8 flex items-end justify-between gap-6">
      <div>
        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block mb-1">
          {t("home.trending.eyebrow")}
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {t("home.trending.title")}
        </h2>
      </div>
    </div>
  );
};
