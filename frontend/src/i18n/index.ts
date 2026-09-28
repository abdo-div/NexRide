import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./locales/ar.json";
import en from "./locales/en.json";

export const LANGUAGES = {
  ar: { label: "العربية", dir: "rtl" },
  en: { label: "English", dir: "ltr" },
} as const;

export type LanguageKey = keyof typeof LANGUAGES;

export const DEFAULT_LANGUAGE: LanguageKey = "ar";

const STORAGE_KEY = "nexride-lang";

const getInitialLanguage = (): LanguageKey => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in LANGUAGES) return stored as LanguageKey;
  return DEFAULT_LANGUAGE;
};

export const changeLanguage = (lang: LanguageKey) => {
  localStorage.setItem(STORAGE_KEY, lang);
  i18n.changeLanguage(lang);
};

export const setDocumentDirection = (lang: string) => {
  const dir = LANGUAGES[lang as LanguageKey]?.dir ?? LANGUAGES.ar.dir;
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
};

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  supportedLngs: ["ar", "en"],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on("languageChanged", setDocumentDirection);
setDocumentDirection(i18n.language);

export default i18n;