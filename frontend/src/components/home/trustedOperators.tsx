import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { ArrowRight } from "@phosphor-icons/react";
import { HomeSectionError } from "./HomeSectionError";
import type { FleetOperator } from "../../types/operators";
import { companyLogoUrl } from "../../lib/vehicleMapper";
import { ShieldCheck } from "@phosphor-icons/react";

interface TrustedOperatorsProps {
  operators: FleetOperator[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const TrustedOperators: React.FC<TrustedOperatorsProps> = ({
  operators,
  loading,
  error,
  onRetry,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const showError = error !== null && !loading;
  const preview = operators.slice(0, 4);

  return (
    <section id="fleet-operators" className="relative w-full overflow-hidden border-b border-slate-900 bg-[#071426] px-6 py-12 text-white lg:px-12">
      <img src="/3carsUpdated.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_55%]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,25,50,.94),rgba(11,52,95,.76),rgba(8,35,68,.86))] rtl:bg-[linear-gradient(270deg,rgba(6,25,50,.94),rgba(11,52,95,.76),rgba(8,35,68,.86))]" />
      <div className="pointer-events-none absolute inset-0 bg-blue-700/10 mix-blend-color" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="relative mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[minmax(250px,.8fr)_minmax(0,2.2fr)] lg:gap-12"
      >
        <div className="max-w-sm">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block mb-2">
            {t("home.operators.eyebrow")}
          </span>
          <h2 className="text-3xl font-black tracking-tight text-white lg:text-4xl">
            {t("home.operators.title")}
          </h2>
          <p className="mt-3 text-xs font-medium leading-relaxed text-slate-300 sm:text-sm">
            {t("home.operators.subtitle")}
          </p>
          <button
            type="button"
            onClick={() => navigate("/companies")}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-xs font-extrabold text-white shadow-lg shadow-blue-950/30 transition-all hover:bg-blue-500"
          >
            <span>{t("home.operators.showAllCompanies")}</span>
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden" role="status" aria-busy="true" aria-label={t("common.loading", { defaultValue: "Loading operators" })}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer h-36 w-48 shrink-0 rounded-xl border border-white/10" />
            ))}
          </div>
        ) : showError ? (
          <HomeSectionError onRetry={onRetry} />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {preview.map((operator) => (
              <button key={operator.id} type="button" onClick={() => navigate(`/companies/${operator.id}`)} className="group flex h-36 w-48 shrink-0 flex-col items-center justify-center rounded-xl border border-white/20 bg-white p-5 text-center shadow-xl transition hover:-translate-y-1 hover:shadow-2xl sm:w-52">
                {companyLogoUrl(operator.logo) ? (
                  <img src={companyLogoUrl(operator.logo) ?? ""} alt="" className="mb-3 h-10 max-w-32 object-contain" />
                ) : (
                  <span className="mb-3 text-2xl font-black tracking-tight text-slate-900">{operator.name}</span>
                )}
                <span className="text-xs font-bold text-slate-900">{operator.name}</span>
                {operator.isVerified && <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600"><ShieldCheck weight="fill" />{t("home.operators.verifiedPartner")}</span>}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
};

export default TrustedOperators;
