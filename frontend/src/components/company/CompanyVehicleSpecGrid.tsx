import React from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal } from "lucide-react";
import type { CompanyVehicleProfile } from "../../types/companyVehicle";
import { SectionCard } from "./CompanyVehicleBits";
import { categoryLabel } from "./companyFleetUi";

interface CompanyVehicleSpecGridProps {
  vehicle: CompanyVehicleProfile;
}

/**
 * Technical specifications grid — every cell maps to a real vehicle field
 * (year, body, transmission, fuel, seats, registry code, hub, pickup).
 */
export const CompanyVehicleSpecGrid: React.FC<CompanyVehicleSpecGridProps> = ({
  vehicle,
}) => {
  const { t } = useTranslation();

  const cells: Array<{ label: string; value: string }> = [
    {
      label: t("company.vehiclePage.specs.year"),
      value: vehicle.year ? String(vehicle.year) : "—",
    },
    {
      label: t("company.vehiclePage.specs.category"),
      value: categoryLabel(t, vehicle.type),
    },
    {
      label: t("company.vehiclePage.specs.transmission"),
      value: t(`company.fleetPage.transmission.${vehicle.transmission ?? "AUTOMATIC"}`),
    },
    {
      label: t("company.vehiclePage.specs.fuel"),
      value: t(`company.fleetPage.fuel.${vehicle.fuelType ?? "GASOLINE"}`),
    },
    {
      label: t("company.vehiclePage.specs.seats"),
      value: vehicle.seats
        ? `${vehicle.seats} ${t("company.vehiclePage.specs.seatsSuffix")}`
        : "—",
    },
    {
      label: t("company.vehiclePage.specs.code"),
      value: vehicle.code,
    },
    {
      label: t("company.vehiclePage.specs.hub"),
      value: vehicle.city ?? "—",
    },
    {
      label: t("company.vehiclePage.specs.pickup"),
      value: vehicle.pickupLocation ?? "—",
    },
  ];

  return (
    <SectionCard
      icon={SlidersHorizontal}
      title={t("company.vehiclePage.specs.title")}
      titleAr={t("company.vehiclePage.specs.titleAr")}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cells.map((cell) => (
          <div key={cell.label} className="rounded-xl bg-[#EFF4FF] p-3">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              {cell.label}
            </span>
            <span className="mt-1 block text-sm font-bold text-[#0B1C30]">{cell.value}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

export default CompanyVehicleSpecGrid;