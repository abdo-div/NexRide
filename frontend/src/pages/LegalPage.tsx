import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  ArrowLeft,
  BookOpenText,
  CalendarDays,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

import {
  getLegalDocument,
  legalDocuments,
  type LegalDocumentKey,
} from "../data/legalContent";

const documentLinks: Array<{
  key: LegalDocumentKey;
  path: string;
  icon: typeof BookOpenText;
}> = [
  { key: "terms", path: "/terms", icon: BookOpenText },
  { key: "privacy", path: "/privacy", icon: ShieldCheck },
  { key: "cancellation", path: "/cancellation-policy", icon: RefreshCcw },
];

export const LegalPage = ({ documentKey }: { documentKey: LegalDocumentKey }) => {
  const { i18n } = useTranslation();
  const language = i18n.language.startsWith("ar") ? "ar" : "en";
  const document = getLegalDocument(documentKey, language);
  const homeLabel = language === "ar" ? "العودة إلى الرئيسية" : "Back to home";
  const navigationLabel = language === "ar" ? "الوثائق القانونية" : "Legal documents";

  useEffect(() => {
    const previousTitle = window.document.title;
    window.document.title = `${document.title} | NexRide`;
    return () => {
      window.document.title = previousTitle;
    };
  }, [document.title]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 pt-24 md:pt-28">
      <header className="border-b border-slate-200 bg-[#07182B] text-white">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 md:py-16">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-200 transition hover:text-white"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {homeLabel}
          </Link>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-blue-300">
            {document.eyebrow}
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            {document.title}
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            {document.summary}
          </p>
          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200">
            <CalendarDays className="size-4 text-blue-300" />
            {document.effectiveLabel}: {document.effectiveDate}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:py-14">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500">
            {navigationLabel}
          </p>
          <nav className="grid gap-2" aria-label={navigationLabel}>
            {documentLinks.map(({ key, path, icon: Icon }) => {
              const label = legalDocuments[key][language].shortTitle;
              const active = key === documentKey;
              return (
                <Link
                  key={key}
                  to={path}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                    active
                      ? "bg-[#142B4A] text-white shadow-sm"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-blue-700"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <article className="min-w-0">
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm font-semibold leading-7 text-blue-950">
            {document.important}
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_-28px_rgba(15,23,42,.35)]">
            {document.sections.map((section, index) => (
              <section
                key={section.title}
                className={`p-6 sm:p-8 ${index > 0 ? "border-t border-slate-200" : ""}`}
              >
                <h2 className="text-xl font-black tracking-tight text-[#0B1C30]">
                  {section.title}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-sm leading-7 text-slate-600 sm:text-[15px]">
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-4 grid gap-3 text-sm leading-7 text-slate-600 sm:text-[15px]">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-blue-600" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
};

export default LegalPage;
