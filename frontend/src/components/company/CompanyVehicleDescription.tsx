import React from "react";
import { useTranslation } from "react-i18next";
import { PencilLine, ScrollText } from "lucide-react";
import type { CompanyVehicleProfile } from "../../types/companyVehicle";
import { SectionCard } from "./CompanyVehicleBits";

interface CompanyVehicleDescriptionProps {
  vehicle: CompanyVehicleProfile;
}

/** The vehicle's own listing copy if one was written, else an honest empty state. */
export const CompanyVehicleDescription: React.FC<CompanyVehicleDescriptionProps> = ({
  vehicle,
}) => {
  const { t } = useTranslation();

  return (
    <SectionCard
      icon={ScrollText}
      title={t("company.vehiclePage.desc.title")}
      titleAr={t("company.vehiclePage.desc.titleAr")}
      action={
        <button
          type="button"
          disabled
          title={t("company.vehiclePage.soon")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
          {t("company.vehiclePage.desc.edit")}
        </button>
      }
    >
      {vehicle.description ? (
        <p className="text-sm leading-relaxed text-[#0B1C30]">{vehicle.description}</p>
      ) : (
        <p className="text-sm text-[#9AA4B5]">{t("company.vehiclePage.desc.empty")}</p>
      )}
    </SectionCard>
  );
};

export default CompanyVehicleDescription;