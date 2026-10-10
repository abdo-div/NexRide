import React from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import {
  LANGUAGES,
  changeLanguage,
  type LanguageKey,
} from "../../i18n";

export const LanguageToggle: React.FC = () => {
  const { i18n } = useTranslation();
  const current = (i18n.language in LANGUAGES
    ? i18n.language
    : "ar") as LanguageKey;

  const toggle = () => {
    changeLanguage(current === "ar" ? "en" : "ar");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${current === "ar" ? "English" : "العربية"}`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200/80 text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-colors shrink-0 cursor-pointer"
    >
      <Languages className="w-3.5 h-3.5 text-slate-500" />
      <span>{LANGUAGES[current].label}</span>
    </button>
  );
};

export default LanguageToggle;