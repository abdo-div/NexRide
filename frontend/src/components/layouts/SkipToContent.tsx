import { useTranslation } from "react-i18next";

export function SkipToContent() {
  const { t } = useTranslation();

  const focusMainContent = () => {
    window.requestAnimationFrame(() => {
      document.getElementById("main-content")?.focus();
    });
  };

  return (
    <a
      href="#main-content"
      onClick={focusMainContent}
      className="fixed start-4 top-4 z-[200] -translate-y-24 rounded-xl bg-[var(--brand-950)] px-5 py-3 text-sm font-bold text-white shadow-2xl transition-transform focus:translate-y-0 focus:outline-none focus:ring-4 focus:ring-blue-300"
    >
      {t("accessibility.skipToContent")}
    </a>
  );
}
