import React from "react";
import { PARTNER_METRICS } from "../../data/partnerData";

export const PartnerMetrics: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-8">
      {PARTNER_METRICS.map((metric) => {
        const isAmber = metric.variant === "amber";
        const isCyan = metric.variant === "cyan";

        return (
          <div
            key={metric.id}
            className="bg-[#0b1220]/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between"
          >
            <h4
              className={`text-xs font-black tracking-tight mb-1 ${
                isAmber
                  ? "text-amber-400"
                  : isCyan
                    ? "text-cyan-400"
                    : "text-blue-400"
              }`}
            >
              {metric.title}
            </h4>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              {metric.subtitle}
            </p>
          </div>
        );
      })}
    </div>
  );
};
