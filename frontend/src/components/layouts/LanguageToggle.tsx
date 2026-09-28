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

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  onDark = false,
}) => {
  const { i18n } = useTranslation();
  const current = (i18n.language in LANGUAGES
    ? i18n.language
    : "ar") as LanguageKey;

  const toggle = () => {
    changeLanguage(current === "ar" ? "en" : "ar");
  };

  const base = onDark
    ? "text-white hover:text-blue-300 [text-shadow:0_1px_3px_rgba(0,0,0,0.35)] border-white/20"
    : "text-slate-700 hover:text-blue-600 border-[#E2E8F0]";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${current === "ar" ? "English" : "العربية"}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm font-semibold transition-colors shrink-0 cursor-pointer ${base}`}
    >
      <Languages className="w-4 h-4" />
      <span>{LANGUAGES[current].label}</span>
    </button>
  );
};

export default LanguageToggle;