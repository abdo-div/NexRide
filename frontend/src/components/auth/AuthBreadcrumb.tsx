import React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight, ShieldCheck } from "lucide-react";

export const AuthBreadcrumb: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Link
          to="/"
          className="text-xs font-semibold hover:text-[#2563EB] transition-colors"
        >
          {t("auth.breadcrumb.home")}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
        <span className="text-xs font-semibold text-[#0F172A]">
          {t("auth.breadcrumb.title")}
        </span>
      </div>
      <div className="flex items-center gap-2.5 bg-white px-3.5 py-1.5 rounded-full shadow-sm border border-[#E2E8F0]">
        <span className="inline-flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="text-[11px] font-semibold text-slate-600">
          {t("auth.breadcrumb.status")}
        </span>
        <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
      </div>
    </div>
  );
};

export default AuthBreadcrumb;