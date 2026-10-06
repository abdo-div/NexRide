import React from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Navigation } from "lucide-react";
import type { CompanyVehicleEditForm } from "../../hooks/useCompanyVehicleEditForm";
import { SectionCard } from "./CompanyVehicleBits";
import { ComingSoonPill, EditField } from "./CompanyVehicleEditBits";

interface CompanyVehicleEditLocationProps {
  form: CompanyVehicleEditForm;
}

/**
 * Card 6 — Location, depot & handover options. City and pickup point are
 * editable; the last known coordinates stay a read-only telemetry chip, and
 * depot networks, delivery zones and handover protocols aren't modelled yet
 * (coming soon).
 */
export const CompanyVehicleEditLocation: React.FC<CompanyVehicleEditLocationProps> = ({
  form,
}) => {
  const { t } = useTranslation();
  const { draft, fieldErrors, setField } = form;
  const { coordinates, gpsActive } = form.previewVehicle;

  return (
    <SectionCard
      icon={MapPin}
      iconStyle="bg-[#FFEFD6] text-[#8E5E00]"
      title={t("company.editVehiclePage.location.title")}
      titleAr={t("company.editVehiclePage.location.titleAr")}
      subtitle={t("company.editVehiclePage.location.subtitle")}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <EditField
          label={t("company.editVehiclePage.location.city")}
          labelAr={t("company.editVehiclePage.location.cityAr")}
          value={draft.city}
          onChange={(value) => setField("city", value)}
          error={fieldErrors.city}
        />
        <EditField
          label={t("company.editVehiclePage.location.pickup")}
          labelAr={t("company.editVehiclePage.location.pickupAr")}
          value={draft.pickupLocation}
          onChange={(value) => setField("pickupLocation", value)}
          error={fieldErrors.pickupLocation}
        />
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-[#F1F5F9] px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-semibold text-[#0B1C30] dark:text-white">
          <Navigation className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
          {t("company.editVehiclePage.location.coords")}
        </span>
        {coordinates ? (
          <span className="inline-flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                gpsActive
                  ? "bg-[#ECFDF5] text-[#0E6B34]"
                  : "bg-[#F1F5F9] text-[#64748B]"
              }`}
            >
              {gpsActive
                ? t("company.vehiclePage.live")
                : t("company.vehiclePage.offline")}
            </span>
            <span className="font-mono text-xs text-[#565E74]">
              {Number(coordinates[1]).toFixed(4)}° N,{" "}
              {Number(coordinates[0]).toFixed(4)}° E
            </span>
          </span>
        ) : (
          <span className="text-xs text-[#9AA4B5]">
            {t("company.editVehiclePage.location.noCoords")}
          </span>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F7F9FC] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#9AA4B5]" aria-hidden="true" />
              <span className="text-xs font-bold text-[#0B1C30] dark:text-white">
                {t("company.editVehiclePage.location.depot")} ·{" "}
                {t("company.editVehiclePage.location.deliveryPoints")}
              </span>
            </div>
            <p className="text-[11px] text-[#9AA4B5]">
              {t("company.editVehiclePage.location.handover")}
            </p>
            <p className="text-[11px] text-[#9AA4B5]">{t("company.editVehiclePage.location.geofence")}</p>
          </div>
          <ComingSoonPill>{t("company.vehiclePage.soon")}</ComingSoonPill>
        </div>
        <p className="mt-2 text-[11px] text-[#9AA4B5]">{t("company.editVehiclePage.location.geoNote")}</p>
      </div>
    </SectionCard>
  );
};

export default CompanyVehicleEditLocation;