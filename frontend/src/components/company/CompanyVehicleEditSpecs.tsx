import React from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal } from "lucide-react";
import type { CompanyVehicleEditForm } from "../../hooks/useCompanyVehicleEditForm";
import { SectionCard } from "./CompanyVehicleBits";
import { EditField } from "./CompanyVehicleEditBits";

interface CompanyVehicleEditSpecsProps {
  form: CompanyVehicleEditForm;
  essentialOnly?: boolean;
}

/**
 * Card 2 — Technical specifications. Transmission, fuel, seats and doors are
 * editable (they map 1:1 to the vehicle contract); the remaining telemetry &
 * trim rows are labelled "coming soon" because the record doesn't carry them.
 */
export const CompanyVehicleEditSpecs: React.FC<CompanyVehicleEditSpecsProps> = ({
  form,
  essentialOnly = false,
}) => {
  const { t } = useTranslation();
  const { draft, fieldErrors, setField } = form;

  const transmissionOptions = (["MANUAL", "AUTOMATIC"] as const).map((value) => ({
    value,
    label: t(`company.fleetPage.transmission.${value}`),
  }));

  const fuelOptions = (["GASOLINE", "DIESEL", "ELECTRIC", "HYBRID"] as const).map(
    (value) => ({ value, label: t(`company.fleetPage.fuel.${value}`) }),
  );

  return (
    <SectionCard
      icon={SlidersHorizontal}
      title={t("company.editVehiclePage.specs.title")}
      titleAr={t("company.editVehiclePage.specs.titleAr")}
      subtitle={t("company.editVehiclePage.specs.subtitle")}
    >
      <p className="mb-3 text-xs font-bold text-[#565E74]">{t("company.editVehiclePage.specs.coreGroup")}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <EditField
          label={t("company.editVehiclePage.specs.transmission")}
          labelAr={t("company.editVehiclePage.specs.transmissionAr")}
          type="select"
          required
          options={transmissionOptions}
          value={draft.transmission}
          onChange={(value) => setField("transmission", value)}
          error={fieldErrors.transmission}
        />
        <EditField
          label={t("company.editVehiclePage.specs.fuel")}
          labelAr={t("company.editVehiclePage.specs.fuelAr")}
          type="select"
          required
          options={fuelOptions}
          value={draft.fuelType}
          onChange={(value) => setField("fuelType", value)}
          error={fieldErrors.fuelType}
        />
        <EditField
          label={t("company.editVehiclePage.specs.seats")}
          labelAr={t("company.editVehiclePage.specs.seatsAr")}
          type="number"
          required
          min={1}
          max={20}
          value={draft.seats}
          onChange={(value) => setField("seats", value)}
          error={fieldErrors.seats}
        />
        <EditField
          label={t("company.editVehiclePage.specs.doors")}
          labelAr={t("company.editVehiclePage.specs.doorsAr")}
          type="number"
          required
          min={1}
          max={10}
          value={draft.doors}
          onChange={(value) => setField("doors", value)}
          error={fieldErrors.doors}
        />
      </div>

      {!essentialOnly && <><p className="mb-3 mt-6 border-t border-[#EEF1F5] pt-5 text-xs font-bold text-[#565E74]">{t("company.editVehiclePage.specs.detailsGroup")}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <EditField label={t("company.editVehiclePage.specs.odometer")} type="number" min={0} unit={t("company.editVehiclePage.specs.kmUnit")} placeholder="0" value={draft.odometer} onChange={(v) => setField("odometer", v)} error={fieldErrors.odometer} />
        <EditField label={t("company.editVehiclePage.specs.engine")} placeholder={t("company.editVehiclePage.specs.enginePlaceholder")} value={draft.engine} onChange={(v) => setField("engine", v)} error={fieldErrors.engine} />
        <EditField label={t("company.editVehiclePage.specs.drivetrain")} placeholder={t("company.editVehiclePage.specs.drivetrainPlaceholder")} value={draft.drivetrain} onChange={(v) => setField("drivetrain", v)} error={fieldErrors.drivetrain} />
        <EditField label={t("company.editVehiclePage.specs.exterior")} placeholder={t("company.editVehiclePage.specs.colorPlaceholder")} value={draft.exteriorColor} onChange={(v) => setField("exteriorColor", v)} error={fieldErrors.exteriorColor} />
        <EditField label={t("company.editVehiclePage.specs.interior")} placeholder={t("company.editVehiclePage.specs.colorPlaceholder")} value={draft.interiorColor} onChange={(v) => setField("interiorColor", v)} error={fieldErrors.interiorColor} />
        <EditField label={t("company.editVehiclePage.specs.tank")} type="number" min={0} unit={t("company.editVehiclePage.specs.literUnit")} placeholder="0" value={draft.tankCapacity} onChange={(v) => setField("tankCapacity", v)} error={fieldErrors.tankCapacity} />
      </div></>}
    </SectionCard>
  );
};

export default CompanyVehicleEditSpecs;
