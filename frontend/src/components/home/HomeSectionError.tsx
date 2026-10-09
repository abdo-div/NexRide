import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowClockwise as RefreshCcw } from "@phosphor-icons/react";

interface HomeSectionErrorProps {
  onRetry: () => void;
}

/** Inline error + retry block used by every data-driven home section. */
export const HomeSectionError: React.FC<HomeSectionErrorProps> = ({
  onRetry,
}) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
      <p className="text-sm font-bold text-slate-700">
        {t("home.dataError.title")}
      </p>
      <p className="text-xs text-slate-500 font-medium mt-1 mb-5">
        {t("home.dataError.desc")}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors"
      >
        <RefreshCcw className="w-3.5 h-3.5" />
        <span>{t("home.dataError.retry")}</span>
      </button>
    </div>
  );
};
