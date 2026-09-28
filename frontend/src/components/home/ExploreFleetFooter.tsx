import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

export const ExploreFleetFooter: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="mt-12 flex justify-center">
      <a
        href="#all-vehicles"
        className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-800 hover:text-blue-600 font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-2 group"
      >
        <span>{t("home.trending.exploreAll")}</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1 transition-transform" />
      </a>
    </div>
  );
};
