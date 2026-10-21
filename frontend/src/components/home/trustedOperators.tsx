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
  const showAllVisible = !loading && !showError && operators.length > 4;
  const preview = operators.slice(0, 4);

  return (
    <section id="fleet-operators" className="relative w-full overflow-hidden border-b border-slate-900 bg-[#071426] px-6 py-14 text-white lg:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(37,99,235,.24),transparent_32%),linear-gradient(135deg,rgba(255,255,255,.04),transparent_45%)]" />
      <div className="relative mx-auto max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block mb-2">
            {t("home.operators.eyebrow")}
          </span>
          <h2 className="text-3xl font-black tracking-tight text-white">
            {t("home.operators.title")}
          </h2>
        </div>

        <p className="max-w-sm text-xs font-medium leading-relaxed text-slate-300 sm:text-sm">
          {t("home.operators.subtitle")}
        </p>
      </motion.div>

      {/* Operators Grid */}
      {loading ? (
        <div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          role="status"
          aria-busy="true"
          aria-label={t("common.loading", { defaultValue: "Loading operators" })}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton-shimmer h-[135px] rounded-2xl border border-white/10"
            />
          ))}
        </div>
      ) : showError ? (
        <HomeSectionError onRetry={onRetry} />
      ) : (
        <div className="gap-5 flex flex-col">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {preview.map((operator) => (
              <button key={operator.id} type="button" onClick={() => navigate(`/companies/${operator.id}`)} className="group flex min-h-32 flex-col items-center justify-center rounded-xl border border-white/15 bg-white p-5 text-center shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
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
          {showAllVisible && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex justify-center"
            >
              <button
                type="button"
                onClick={() => navigate("/companies")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:border-white/30 hover:bg-white/15"
              >
                <span>{t("home.operators.showAllCompanies")}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </motion.div>
          )}
        </div>
      )}
      </div>
    </section>
  );
};

export default TrustedOperators;
