import React from "react";
import { useTranslation } from "react-i18next";
import { formatLYD } from "../../lib/bookingView";
import type { CompanyDashboardData } from "../../types/companyDashboard";

interface CompanyFinancialBarProps {
  data: CompanyDashboardData;
}

/**
 * Rolling financial surface strip. Every figure is the server-aggregated total
 * for the requested period, and the take rate comes from the real cut share.
 */
export const CompanyFinancialBar: React.FC<CompanyFinancialBarProps> = ({
  data,
}) => {
  const { t } = useTranslation();
  const { financial, fleet } = data;

  return (
    <div className="grid grid-cols-2 gap-3 pt-1 lg:grid-cols-4">
      <div className="flex flex-col rounded-xl bg-[#E5EEFF] p-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
          {t("company.financial.gross")}
        </span>
        <span className="mt-0.5 text-lg font-extrabold text-[#0B1C30]">
          {formatLYD(financial.gross)} <span className="text-sm font-bold text-[#565E74]">LYD</span>
        </span>
        <span className="text-xs text-[#565E74]">
          {t("company.financial.allIncluded")}
        </span>
      </div>

      <div className="flex flex-col rounded-xl bg-[#E5EEFF] p-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
          {t("company.financial.take", { rate: financial.takeRatePct })}
        </span>
        <span className="mt-0.5 text-lg font-extrabold text-[#BA1A1A]">
          -{formatLYD(financial.cut)} <span className="text-sm font-bold text-[#565E74]">LYD</span>
        </span>
        <span className="text-xs text-[#565E74]">
          {t("company.financial.takeHint")}
        </span>
      </div>

      <div className="flex flex-col rounded-xl bg-[#DCE9FF] p-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
          {t("company.financial.net")}
        </span>
        <span className="mt-0.5 text-lg font-extrabold text-[#2563EB]">
          {formatLYD(financial.net)} <span className="text-sm font-bold text-[#565E74]">LYD</span>
        </span>
        <span className="text-xs text-[#565E74]">
          {t("company.financial.payoutRatio", { rate: financial.takeRatePct })}
        </span>
      </div>

      <div className="flex flex-col rounded-xl bg-[#E5EEFF] p-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
          {t("company.financial.avgDaily")}
        </span>
        <span className="mt-0.5 text-lg font-extrabold text-[#0B1C30]">
          {formatLYD(financial.avgDailyEarning)} <span className="text-sm font-bold text-[#565E74]">LYD</span>
        </span>
        <span className="text-xs text-[#565E74]">
          {t("company.financial.acrossUnits", { count: fleet.total })}
        </span>
      </div>
    </div>
  );
};

export default CompanyFinancialBar;