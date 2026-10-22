import React from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import {
  LANGUAGES,
  changeLanguage,
  type LanguageKey,
} from "../../i18n";

interface LanguageToggleProps {
  onDark?: boolean;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ onDark = false }) => {
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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer ${onDark ? "border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/15" : "border-slate-200/80 text-slate-700 hover:text-blue-600 hover:border-slate-200 hover:bg-slate-50/50"}`}
    >
      <Languages className={`w-3.5 h-3.5 ${onDark ? "text-white/75" : "text-slate-500"}`} />
      <span>{LANGUAGES[current].label}</span>
    </button>
  );
};

export default LanguageToggle;
