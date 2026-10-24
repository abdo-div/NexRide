import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";

const VISIBILITY_THRESHOLD = 560;

export function BackToTop() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > VISIBILITY_THRESHOLD);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!visible) return null;

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="fixed bottom-5 end-5 z-[90] inline-flex size-12 items-center justify-center rounded-2xl border border-white/15 bg-[var(--brand-950)] text-white shadow-[0_16px_40px_-14px_rgba(7,20,38,0.75)] transition hover:-translate-y-1 hover:bg-[var(--brand-800)] focus-visible:outline-white sm:bottom-7 sm:end-7"
      aria-label={t("accessibility.backToTop")}
      title={t("accessibility.backToTop")}
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </button>
  );
}
