import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

interface ExploreFleetFooterProps {
  /** Live bookable count; the backend caps the list at 100. */
  count: number;
}

export const ExploreFleetFooter: React.FC<ExploreFleetFooterProps> = ({
  count,
}) => {
  const { t } = useTranslation();
  const countLabel =
    count >= 100 ? `${count}+` : String(count);
  return (
    <div className="mt-12 flex justify-center">
      <Link
        to="/fleet"
        className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-800 hover:text-blue-600 font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-2 group"
      >
        <span>{t("home.trending.exploreAll", { count: countLabel })}</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1 transition-transform" />
      </Link>
    </div>
  );
};