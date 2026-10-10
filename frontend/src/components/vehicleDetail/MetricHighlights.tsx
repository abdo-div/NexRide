import React from "react";
import { useTranslation } from "react-i18next";
import { Gauge } from "lucide-react";
import { DetailIcon } from "./iconMap";
import type { DetailMetric } from "../../types/vehicleDetail";

export const MetricHighlights: React.FC<{ metrics: DetailMetric[] }> = ({ metrics }) => {
  const { t } = useTranslation();

  const localizeValue = (value: string) => {
    const match = /^(\d+)\s+Seats$/.exec(value);
    return match ? `${match[1]} ${t("data.common.seats")}` : t(value);
  };

  return (
    <section className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-bold text-[#0F172A] flex items-center gap-2">
          <Gauge className="w-5 h-5 text-[#2563EB]" />
          {t("vehicleDetail.metricsHeading")}
        </h2>
        <span className="text-[11px] text-[#64748B] uppercase tracking-wider font-semibold">
          {t("vehicleDetail.factoryCalibration")}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl flex flex-col gap-1 hover:border-blue-200 transition-colors"
          >
            <div className="flex items-center gap-2 text-[#64748B]">
              <DetailIcon name={m.icon} className="w-5 h-5 text-[#2563EB]" />
              <span className="text-[11px] uppercase font-bold">{t(m.label)}</span>
            </div>
            <span className="text-[14px] font-bold text-[#0F172A]">{localizeValue(m.value)}</span>
            <span className="text-[12px] text-[#64748B]">{t(m.sub)}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
