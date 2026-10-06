import React from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck } from "lucide-react";
import type { CompanyVehicleEditForm } from "../../hooks/useCompanyVehicleEditForm";
import { SectionCard } from "./CompanyVehicleBits";
import { EditField, ReadonlyField } from "./CompanyVehicleEditBits";

interface CompanyVehicleEditInfoProps {
  form: CompanyVehicleEditForm;
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
          onChange={(value) => setField("make", value)}
          error={fieldErrors.make}
        />
        <EditField
          label={t("company.editVehiclePage.info.model")}
          labelAr={t("company.editVehiclePage.info.modelAr")}
          value={draft.model}
          onChange={(value) => setField("model", value)}
          error={fieldErrors.model}
        />
        <EditField
          label={t("company.editVehiclePage.info.year")}
          labelAr={t("company.editVehiclePage.info.yearAr")}
          type="number"
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
          options={typeOptions}
          value={draft.type}
          onChange={(value) => setField("type", value)}
          error={fieldErrors.type}
        />
        <ReadonlyField
          label={t("company.editVehiclePage.info.plate")}
          labelAr={t("company.editVehiclePage.info.plateAr")}
          comingSoon
          hint={t("company.editVehiclePage.info.registrationTag")}
        />
        <ReadonlyField
          label={t("company.editVehiclePage.info.vin")}
          labelAr={t("company.editVehiclePage.info.vinAr")}
          comingSoon
          hint={t("company.editVehiclePage.info.registry")}
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
          onChange={(value) => setField("description", value)}
          error={fieldErrors.description}
        />
      </div>
    </SectionCard>
  );
};

export default CompanyVehicleEditInfo;