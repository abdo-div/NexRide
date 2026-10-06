import React from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal } from "lucide-react";
import type { CompanyVehicleEditForm } from "../../hooks/useCompanyVehicleEditForm";
import { SectionCard } from "./CompanyVehicleBits";
import { ComingSoonPill, EditField } from "./CompanyVehicleEditBits";

interface CompanyVehicleEditSpecsProps {
  form: CompanyVehicleEditForm;
}

const telemetryKeys = [
  "odometer",
  "engine",
  "drivetrain",
  "exterior",
  "interior",
  "tank",
] as const;

/**
 * Card 2 — Technical specifications. Transmission, fuel, seats and doors are
 * editable (they map 1:1 to the vehicle contract); the remaining telemetry &
 * trim rows are labelled "coming soon" because the record doesn't carry them.
 */
export const CompanyVehicleEditSpecs: React.FC<CompanyVehicleEditSpecsProps> = ({
  form,
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <EditField
          label={t("company.editVehiclePage.specs.transmission")}
          labelAr={t("company.editVehiclePage.specs.transmissionAr")}
          type="select"
          options={transmissionOptions}
          value={draft.transmission}
          onChange={(value) => setField("transmission", value)}
          error={fieldErrors.transmission}
        />
        <EditField
          label={t("company.editVehiclePage.specs.fuel")}
          labelAr={t("company.editVehiclePage.specs.fuelAr")}
          type="select"
          options={fuelOptions}
          value={draft.fuelType}
          onChange={(value) => setField("fuelType", value)}
          error={fieldErrors.fuelType}
        />
        <EditField
          label={t("company.editVehiclePage.specs.seats")}
          labelAr={t("company.editVehiclePage.specs.seatsAr")}
          type="number"
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
          min={1}
          max={10}
          value={draft.doors}
          onChange={(value) => setField("doors", value)}
          error={fieldErrors.doors}
        />
      </div>

      <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F7F9FC] p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-[#0B1C30] dark:text-white">
            {t("company.editVehiclePage.specs.telemetryTitle")}
          </span>
          <ComingSoonPill>{t("company.vehiclePage.soon")}</ComingSoonPill>
        </div>
        <p className="mt-1 text-[11px] text-[#9AA4B5]">
          {t("company.editVehiclePage.specs.telemetryNote")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {telemetryKeys.map((key) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-[#9AA4B5]"
            >
              {t(`company.editVehiclePage.specs.${key}`)}
            </span>
          ))}
        </div>
      </div>
    </SectionCard>
  );
};

export default CompanyVehicleEditSpecs;