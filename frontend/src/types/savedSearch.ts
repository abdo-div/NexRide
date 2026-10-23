import type { VehicleFuelType, VehicleTransmission, VehicleType } from "./vehicle";

export interface SavedSearchCriteria {
  location: string;
  type: VehicleType[];
  transmission: "" | VehicleTransmission;
  fuelType: "" | VehicleFuelType;
  maxPrice: number | null;
  startDate: string | null;
  endDate: string | null;
}

export interface SavedSearch {
  _id: string;
  name: string;
  criteria: SavedSearchCriteria;
  alertsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
