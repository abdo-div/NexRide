import { ArrowRight, Compass, Home, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="relative isolate flex min-h-[72vh] items-center overflow-hidden bg-[var(--surface-subtle)] px-5 py-20 sm:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(37,99,235,0.12),transparent_30%),radial-gradient(circle_at_85%_75%,rgba(20,43,74,0.1),transparent_32%)]" />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center" aria-hidden="true">
          <div className="absolute inset-[12%] rounded-full border border-dashed border-blue-300/70" />
          <div className="absolute inset-[24%] rounded-full bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)]" />
          <MapPin className="relative size-24 text-[var(--brand-700)] drop-shadow-xl" strokeWidth={1.35} />
          <span className="absolute end-[8%] top-[12%] rounded-2xl bg-[var(--brand-950)] px-4 py-2 font-display text-2xl font-bold text-white shadow-xl">404</span>
        </div>

        <section className="text-center lg:text-start" aria-labelledby="not-found-title">
          <p className="section-kicker">{t("notFound.eyebrow")}</p>
          <h1 id="not-found-title" className="section-title mt-4 text-4xl sm:text-5xl lg:text-6xl">
            {t("notFound.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[var(--text-muted)] lg:mx-0 lg:text-lg">
            {t("notFound.description")}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              to="/fleet"
              className="premium-button inline-flex items-center justify-center gap-2 bg-[var(--brand-900)] text-white hover:bg-[var(--brand-800)]"
            >
              <Compass className="size-5" aria-hidden="true" />
              {t("notFound.browseCars")}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
            <Link
              to="/"
              className="premium-button inline-flex items-center justify-center gap-2 border border-[var(--border-subtle)] bg-white text-[var(--text-strong)] hover:border-blue-200 hover:bg-blue-50"
            >
              <Home className="size-5" aria-hidden="true" />
              {t("notFound.home")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
