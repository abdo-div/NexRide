import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./locales/ar.json";

export const LANGUAGES = {
  ar: { label: "العربية", dir: "rtl" },
  en: { label: "English", dir: "ltr" },
} as const;

export type LanguageKey = keyof typeof LANGUAGES;

export const DEFAULT_LANGUAGE: LanguageKey = "ar";

const STORAGE_KEY = "nexride-lang";

type TranslationBundle = { default: Record<string, unknown> };

/**
 * Only the default language is inlined into the initial bundle; every other
 * locale is fetched the first time it is actually needed. Importing both
 * dictionaries eagerly made the entry chunk carry ~120 KB of translations that a
 * single-language visitor never reads.
 */
const LOCALE_LOADERS: Record<LanguageKey, () => Promise<TranslationBundle>> = {
  ar: () => Promise.resolve({ default: ar }),
  en: () => import("./locales/en.json"),
};

const getInitialLanguage = (): LanguageKey => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in LANGUAGES) return stored as LanguageKey;
  return DEFAULT_LANGUAGE;
};

const hasBundle = (lang: LanguageKey): boolean =>
  i18n.hasResourceBundle(lang, "translation");

const loadLocale = async (lang: LanguageKey): Promise<void> => {
  if (hasBundle(lang)) return;
  const { default: bundle } = await LOCALE_LOADERS[lang]();
  if (!hasBundle(lang)) {
    i18n.addResourceBundle(lang, "translation", bundle, true, true);
  }
};

export const changeLanguage = (lang: LanguageKey): void => {
  localStorage.setItem(STORAGE_KEY, lang);

  // An already-loaded dictionary switches synchronously, which keeps the toggle
  // feeling instant; the first switch to a language still in flight waits for
  // its chunk so the UI never renders raw translation keys.
  if (hasBundle(lang)) {
    void i18n.changeLanguage(lang);
    return;
  }
  void loadLocale(lang).then(() => i18n.changeLanguage(lang));
};

export const setDocumentDirection = (lang: string) => {
  const dir = LANGUAGES[lang as LanguageKey]?.dir ?? LANGUAGES.ar.dir;
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
};

i18n.use(initReactI18next).init({
  resources: { [DEFAULT_LANGUAGE]: { translation: ar } },
  lng: getInitialLanguage(),
  // The fallback must be the inlined language: falling back to a dictionary that
  // has not been downloaded yet would render missing keys instead of text.
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: ["ar", "en"],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on("languageChanged", setDocumentDirection);
setDocumentDirection(i18n.language);

/**
 * Resolves the translations for the initial language. It is already-satisfied for
 * the default language and awaits a chunk only for a returning visitor who chose
 * another one, so `main.tsx` must await this before the first render.
 */
export const translationsReady = loadLocale(getInitialLanguage());

export default i18n;
