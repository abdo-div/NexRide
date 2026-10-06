import React from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, Wallet } from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import type { CompanyVehicleProfile } from "../../types/companyVehicle";
import { SectionCard } from "./CompanyVehicleBits";

interface CompanyVehiclePricingProps {
  vehicle: CompanyVehicleProfile;
}

const effectivePerDay = (weekly: number): number => Math.round((weekly / 7) * 100) / 100;

/**
 * Rental pricing matrix — the daily rate always, plus the weekly tier when the
 * vehicle has one. Monthly leasing, deposits and mileage policies aren't part
 * of the booking model, so they're not shown.
 */
export const CompanyVehiclePricing: React.FC<CompanyVehiclePricingProps> = ({
  vehicle,
}) => {
  const { t } = useTranslation();
  const lyd = (value: number) => `${formatLYD(value)} LYD`;

  return (
    <SectionCard
      icon={Wallet}
      iconStyle="bg-[#EFF4FF] text-[#2563EB]"
      title={t("company.vehiclePage.pricing.title")}
      titleAr={t("company.vehiclePage.pricing.titleAr")}
      action={
        <button
          type="button"
          disabled
          title={t("company.vehiclePage.soon")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          {t("company.vehiclePage.pricing.edit")}
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-xl bg-[#EFF4FF] p-4">
          <div>
            <p className="text-sm font-bold text-[#0B1C30]">
              {t("company.vehiclePage.pricing.daily")}
            </p>
            <p className="text-[11px] text-[#5C647A]">{t("company.vehiclePage.pricing.dailyHint")}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-[#004AC6]">
              {lyd(vehicle.dailyPrice)}
              <span className="ml-1 text-xs font-normal text-[#0B1C30]">
                / {t("company.fleetPage.price.day")}
              </span>
            </p>
            <p className="text-[11px] text-[#9AA4B5]">{t("company.fleetPage.price.weekly")}</p>
          </div>
        </div>

        {vehicle.weeklyPrice ? (
          <div className="flex items-center justify-between rounded-xl bg-[#2563EB] p-4 text-white shadow-sm">
            <div>
              <p className="text-sm font-bold">{t("company.vehiclePage.pricing.weekly")}</p>
              <p className="text-[11px] opacity-90">{t("company.vehiclePage.pricing.weeklyHint")}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-extrabold">
                {lyd(vehicle.weeklyPrice)}
                <span className="ml-1 text-xs font-normal opacity-90">
                  / {t("company.fleetPage.price.weekly")}
                </span>
              </p>
              <p className="font-mono text-[11px] opacity-80">
                {t("company.vehiclePage.pricing.effective", {
                  amount: formatLYD(effectivePerDay(vehicle.weeklyPrice)),
                })}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#9AA4B5]">{t("company.vehiclePage.pricing.weeklyHint")}</p>
        )}
      </div>
    </SectionCard>
  );
};

export default CompanyVehiclePricing;