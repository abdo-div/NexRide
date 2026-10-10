import React from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck } from "lucide-react";
import type { CompanyVehicleEditForm } from "../../hooks/useCompanyVehicleEditForm";
import { SectionCard } from "./CompanyVehicleBits";
import { EditField } from "./CompanyVehicleEditBits";

interface CompanyVehicleEditInfoProps {
  form: CompanyVehicleEditForm;
  essentialOnly?: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();

const VEHICLE_TYPES = ["SEDAN", "SUV", "HATCHBACK", "LUXURY", "VAN", "PICKUP"] as const;

/**
 * Card 1 — Basic vehicle information. Make, model, year, category and the
 * description are editable and feed the save payload directly; plate and VIN
 * stay disabled as the registry doesn't carry those fields yet.
 */
export const CompanyVehicleEditInfo: React.FC<CompanyVehicleEditInfoProps> = ({
  form,
}) => {
  const { t } = useTranslation();
  const { draft, fieldErrors, setField } = form;

  const typeOptions = VEHICLE_TYPES.map((value) => ({
    value,
    label: t(`company.fleetPage.category.${value}`),
  }));

  return (
    <SectionCard
      icon={BadgeCheck}
      title={t("company.editVehiclePage.info.title")}
      titleAr={t("company.editVehiclePage.info.titleAr")}
      subtitle={t("company.editVehiclePage.info.subtitle")}
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-3 py-1 text-[11px] font-bold text-[#0E6B34]">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t("company.editVehiclePage.info.verified")}
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <EditField
          label={t("company.editVehiclePage.info.make")}
          labelAr={t("company.editVehiclePage.info.makeAr")}
          value={draft.make}
          required
          placeholder={t("company.editVehiclePage.info.makePlaceholder")}
          onChange={(value) => setField("make", value)}
          error={fieldErrors.make}
        />
        <EditField
          label={t("company.editVehiclePage.info.model")}
          labelAr={t("company.editVehiclePage.info.modelAr")}
          value={draft.model}
          required
          placeholder={t("company.editVehiclePage.info.modelPlaceholder")}
          onChange={(value) => setField("model", value)}
          error={fieldErrors.model}
        />
        <EditField
          label={t("company.editVehiclePage.info.year")}
          labelAr={t("company.editVehiclePage.info.yearAr")}
          type="number"
          required
          min={1900}
          max={CURRENT_YEAR + 1}
          value={draft.year}
          onChange={(value) => setField("year", value)}
          error={fieldErrors.year}
        />
        <EditField
          label={t("company.editVehiclePage.info.category")}
          labelAr={t("company.editVehiclePage.info.categoryAr")}
          type="select"
          required
          options={typeOptions}
          value={draft.type}
          onChange={(value) => setField("type", value)}
          error={fieldErrors.type}
        />
        <EditField
          label={t("company.editVehiclePage.info.plate")}
          labelAr={t("company.editVehiclePage.info.plateAr")}
          value={draft.plateNumber}
          placeholder={t("company.editVehiclePage.info.platePlaceholder")}
          onChange={(value) => setField("plateNumber", value)}
          error={fieldErrors.plateNumber}
        />
        <EditField
          label={t("company.editVehiclePage.info.vin")}
          labelAr={t("company.editVehiclePage.info.vinAr")}
          value={draft.vin}
          placeholder={t("company.editVehiclePage.info.vinPlaceholder")}
          maxLength={17}
          onChange={(value) => setField("vin", value.toUpperCase())}
          error={fieldErrors.vin}
        />
      </div>

      <div className="mt-4">
        <EditField
          label={t("company.editVehiclePage.info.description")}
          labelAr={`${t("company.editVehiclePage.info.descriptionAr")} · ${t(
            "company.editVehiclePage.info.charCount",
            { count: draft.description.length },
          )}`}
          type="textarea"
          rows={3}
          maxLength={500}
          value={draft.description}
          placeholder={t("company.editVehiclePage.info.descriptionPlaceholder")}
          onChange={(value) => setField("description", value)}
          error={fieldErrors.description}
        />
      </div>
    </SectionCard>
  );
};

export default CompanyVehicleEditInfo;
