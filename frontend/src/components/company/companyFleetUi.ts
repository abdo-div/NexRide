import type { TFunction } from "i18next";
import type { CompanyFleetDisplayState, CompanyVehicleType } from "../../types/companyFleet";

export interface FleetStatusTone {
  label: string;
  chip: string;
  dot: string;
}

/** Display label + tone classes for a fleet display state. */
export const fleetStatusTone = (
  t: TFunction,
  status: CompanyFleetDisplayState,
): FleetStatusTone => {
  const label = t(`company.fleetPage.statusLabel.${status}`);
  switch (status) {
    case "available":
      return { label, chip: "bg-[#ECFDF5] text-[#0BA05F]", dot: "bg-[#0BA05F]" };
    case "rented":
      return { label, chip: "bg-[#E5EEFF] text-[#2563EB]", dot: "bg-[#2563EB]" };
    case "maintenance":
      return { label, chip: "bg-[#FFF0E1] text-[#B54E00]", dot: "bg-[#EA8A00]" };
    case "draft":
      return { label, chip: "bg-[#F1F5F9] text-[#64748B]", dot: "bg-[#94A3B8]" };
  }
};

/** Vehicle-category display label from the modelled vehicle type. */
export const categoryLabel = (
  t: TFunction,
  type: CompanyVehicleType | null,
): string => {
  if (!type) return t("company.fleetPage.category.unknown");
  return t(`company.fleetPage.category.${type}`);
};