import React from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Navigation } from "lucide-react";
import type { CompanyVehicleProfile } from "../../types/companyVehicle";
import { SectionCard } from "./CompanyVehicleBits";

interface CompanyVehicleLocationProps {
  vehicle: CompanyVehicleProfile;
}

/**
 * Assigned depot card. The stylized map is replaced with real facts: pickup
 * hub, city, live GPS coordinates when the vehicle reports a last known point,
 * and an "inside depot" only inferred from having a registered location.
 */
export const CompanyVehicleLocation: React.FC<CompanyVehicleLocationProps> = ({
  vehicle,
}) => {
  const { t } = useTranslation();
  const assigned = vehicle.pickupLocation || vehicle.city;

  return (
    <SectionCard
      icon={MapPin}
      iconStyle="bg-[#FFEFD6] text-[#8E5E00]"
      title={t("company.vehiclePage.loc.title")}
      titleAr={t("company.vehiclePage.loc.titleAr")}
      action={
        assigned &&
        vehicle.coordinates && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-3 py-1 text-[11px] font-bold text-[#0E6B34]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0BA05F]" />
            {t("company.vehiclePage.loc.inside")}
          </span>
        )
      }
    >
      {assigned ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-[#EFF4FF] p-4">
            <p className="text-sm font-bold text-[#0B1C30]">{assigned}</p>
            <p className="mt-0.5 text-xs text-[#565E74]">{vehicle.city ?? vehicle.pickupLocation}</p>
          </div>
          {vehicle.coordinates ? (
            <div className="flex items-center justify-between rounded-xl bg-[#F1F5F9] px-4 py-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B1C30]">
                <Navigation className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                {vehicle.gpsActive
                  ? t("company.vehiclePage.live")
                  : t("company.vehiclePage.offline")}
              </span>
              <span className="font-mono text-xs text-[#565E74]">
                {Number(vehicle.coordinates[1]).toFixed(4)}° N,{" "}
                {Number(vehicle.coordinates[0]).toFixed(4)}° E
              </span>
            </div>
          ) : (
            <p className="text-xs text-[#9AA4B5]">{t("company.vehiclePage.loc.noCoords")}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-[#9AA4B5]">{t("company.vehiclePage.loc.notAssigned")}</p>
      )}
    </SectionCard>
  );
};

export default CompanyVehicleLocation;