import React from "react";
import { useTranslation } from "react-i18next";
import { Banknote } from "lucide-react";
import { formatLYD } from "../../lib/bookingView";
import type { CompanyVehicleEditForm } from "../../hooks/useCompanyVehicleEditForm";
import { SectionCard } from "./CompanyVehicleBits";
import { EditField } from "./CompanyVehicleEditBits";

interface CompanyVehicleEditPricingProps {
  form: CompanyVehicleEditForm;
  essentialOnly?: boolean;
}

const effectivePerDay = (weekly: number): number => Math.round((weekly / 7) * 100) / 100;

const weeklySavingsPct = (daily: number, weekly: number): number | null => {
  if (daily <= 0 || weekly <= 0) return null;
  const pct = Math.round((1 - weekly / (daily * 7)) * 100);
  return pct > 0 ? pct : null;
};

/**
 * Card 5 — Rental pricing & escrow deposit. Daily and weekly tiers are editable
 * and drive the live savings readout; the monthly corporate tier, escrow
 * deposit and mileage policies aren't part of the booking model, so they're
 * coming soon.
 */
export const CompanyVehicleEditPricing: React.FC<CompanyVehicleEditPricingProps> = ({
  form,
  essentialOnly = false,
}) => {
  const { t } = useTranslation();
  const { draft, fieldErrors, setField } = form;

  const daily = Number(draft.dailyPrice);
  const weeklyValue = draft.weeklyPrice.trim();
  const weekly = weeklyValue === "" ? null : Number(weeklyValue);
  const savings = weekly != null ? weeklySavingsPct(daily, weekly) : null;

  return (
    <SectionCard
      icon={Banknote}
      iconStyle="bg-[#E5EEFF] text-[#2563EB]"
      title={t("company.editVehiclePage.pricing.title")}
      titleAr={t("company.editVehiclePage.pricing.titleAr")}
      subtitle={t("company.editVehiclePage.pricing.subtitle")}
      action={
        <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-bold text-[#2563EB]">
          {t("company.editVehiclePage.pricing.currency")}
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <EditField
          label={t("company.editVehiclePage.pricing.daily")}
          labelAr={t("company.editVehiclePage.pricing.dailyAr")}
          type="number"
          min={0}
          required
          placeholder="0"
          unit="LYD"
          value={draft.dailyPrice}
          onChange={(value) => setField("dailyPrice", value)}
          error={fieldErrors.dailyPrice}
          hint={t("company.editVehiclePage.pricing.dailyRange")}
        />
        <EditField
          label={t("company.editVehiclePage.pricing.weekly")}
          labelAr={t("company.editVehiclePage.pricing.weeklyAr")}
          type="number"
          min={0}
          placeholder="0"
          unit="LYD"
          value={draft.weeklyPrice}
          onChange={(value) => setField("weeklyPrice", value)}
          error={fieldErrors.weeklyPrice}
          hint={
            weekly != null
              ? t("company.editVehiclePage.pricing.weeklyRange", {
                  amount: formatLYD(effectivePerDay(weekly)),
                })
              : undefined
          }
        />
        {!essentialOnly && <EditField label={t("company.editVehiclePage.pricing.monthly")} type="number" min={0} unit="LYD" placeholder="0" value={draft.monthlyPrice} onChange={(v) => setField("monthlyPrice", v)} error={fieldErrors.monthlyPrice} />}
      </div>

      {savings != null && (
        <div className="mt-3 flex gap-2">
          <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-bold text-[#0E6B34]">
            {t("company.editVehiclePage.pricing.savings", { pct: savings })}
          </span>
          <span className="self-center text-[11px] text-[#9AA4B5]">
            {formatLYD(effectivePerDay(weekly ?? 0))} LYD /{" "}
            {t("company.editVehiclePage.pricing.day")}
          </span>
        </div>
      )}

      {!essentialOnly && <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <EditField
          label={t("company.editVehiclePage.pricing.escrow")}
          labelAr={t("company.editVehiclePage.pricing.escrowAr")}
          type="number" min={0}
          placeholder="0"
          unit="LYD"
          value={draft.depositAmount} onChange={(v) => setField("depositAmount", v)} error={fieldErrors.depositAmount}
        />
        <EditField
          label={t("company.editVehiclePage.pricing.mileage")}
          labelAr={t("company.editVehiclePage.pricing.mileageAr")}
          type="number" min={0}
          placeholder="0"
          unit={t("company.editVehiclePage.pricing.mileageUnit")}
          value={draft.mileageLimit} onChange={(v) => setField("mileageLimit", v)} error={fieldErrors.mileageLimit}
        />
        <EditField
          label={t("company.editVehiclePage.pricing.extra")}
          labelAr={t("company.editVehiclePage.pricing.extraAr")}
          type="number" min={0}
          placeholder="0"
          unit={t("company.editVehiclePage.pricing.extraUnit")}
          value={draft.extraMileageFee} onChange={(v) => setField("extraMileageFee", v)} error={fieldErrors.extraMileageFee}
        />
      </div>}
    </SectionCard>
  );
};

export default CompanyVehicleEditPricing;
