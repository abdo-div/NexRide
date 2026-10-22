import React from "react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export const SpecialOffer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#102b49] text-white">
      <img src="/nexride-hero-marina-v4.png" alt="" className="absolute inset-y-0 start-0 h-full w-full object-cover opacity-60 lg:w-1/2" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,43,73,.08),#102b49_58%)] rtl:bg-[linear-gradient(270deg,rgba(16,43,73,.08),#102b49_58%)]" />
      <div className="relative mx-auto grid min-h-64 max-w-7xl items-center px-6 py-10 lg:grid-cols-2 lg:px-12">
        <div className="hidden lg:block" />
        <div>
          <span className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">{t("home.specialOffer.eyebrow")}</span>
          <h2 className="mt-2 text-3xl font-black tracking-tight">{t("home.specialOffer.title")}</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-300">{t("home.specialOffer.subtitle")}</p>
          <Link to="/fleet" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-xs font-black transition hover:bg-blue-500">
            {t("home.specialOffer.cta")} <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SpecialOffer;
