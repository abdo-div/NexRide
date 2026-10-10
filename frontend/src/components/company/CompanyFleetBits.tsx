import React from "react";
import { useTranslation } from "react-i18next";
import { formatLYD } from "../../lib/bookingView";
import type { CompanyFleetDisplayState } from "../../types/companyFleet";
import { fleetStatusTone } from "./companyFleetUi";

export interface FleetStatusPillProps {
  status: CompanyFleetDisplayState;
  className?: string;
}

/** Colored status pill shared by the table rows and the grid cards. */
export const FleetStatusPill: React.FC<FleetStatusPillProps> = ({
  status,
  className = "",
}) => {
  const { t } = useTranslation();
  const tone = fleetStatusTone(t, status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone.chip} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
      {tone.label}
    </span>
  );
};

export interface PriceBlockProps {
  weeklyPrice?: number | null;
  dailyPrice?: number;
  compact?: boolean;
}

/** Rental pricing block: weekly LYD on top, daily LYD beneath (or daily alone). */
export const PriceBlock: React.FC<PriceBlockProps> = ({
  weeklyPrice,
  dailyPrice = 0,
  compact = false,
}) => {
  const { t } = useTranslation();
  if (weeklyPrice) {
    return (
      <div className="text-left">
        <p className={`font-bold text-[#0B1C30] ${compact ? "text-base" : "text-sm"}`}>
          {formatLYD(weeklyPrice)}
          <span className="ml-1 text-[11px] font-medium text-[#9AA4B5]">
            {t("company.fleetPage.price.weekly")}
          </span>
        </p>
        <p className="text-xs text-[#565E74]">
          {formatLYD(dailyPrice)}
          <span className="ml-1">/ {t("company.fleetPage.price.day")}</span>
        </p>
      </div>
    );
  }
  return (
    <div className="text-left">
      <p className={`font-bold text-[#0B1C30] ${compact ? "text-base" : "text-sm"}`}>
        {formatLYD(dailyPrice)}
        <span className="ml-1 text-[11px] font-medium text-[#9AA4B5]">
          {t("company.fleetPage.price.day")}
        </span>
      </p>
    </div>
  );
};