import React from "react";
import { useTranslation } from "react-i18next";
import { Gavel } from "lucide-react";
import { SectionCard } from "./CompanyVehicleBits";
import { ComingSoonPill } from "./CompanyVehicleEditBits";

/**
 * Card 7 — Rental policies & driver requirements. None of these fields exist
 * on the booking/vehicle model yet, so the whole section is a coming-soon
 * placeholder.
 */
export const CompanyVehicleEditPolicies: React.FC = () => {
  const { t } = useTranslation();

  return (
    <SectionCard
      icon={Gavel}
      iconStyle="bg-[#FFDBE0] text-[#BA1A1A]"
      title={t("company.editVehiclePage.policies.title")}
      titleAr={t("company.editVehiclePage.policies.titleAr")}
      subtitle={t("company.editVehiclePage.policies.subtitle")}
    >
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#E5E7EB] bg-[#F7F9FC] p-5">
        <Gavel className="h-6 w-6 shrink-0 text-[#C3C6D7]" aria-hidden="true" />
        <div>
          <p className="text-sm text-[#0B1C30]">{t("company.editVehiclePage.policies.empty")}</p>
          <div className="mt-1.5">
            <ComingSoonPill>{t("company.vehiclePage.soon")}</ComingSoonPill>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default CompanyVehicleEditPolicies;