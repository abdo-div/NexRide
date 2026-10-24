import { createContext } from "react";

export const MAX_COMPARED_VEHICLES = 3;

export interface VehicleComparisonContextValue {
  vehicleIds: string[];
  hasVehicle: (vehicleId: string) => boolean;
  addVehicle: (vehicleId: string) => "added" | "duplicate" | "limit";
  removeVehicle: (vehicleId: string) => void;
  toggleVehicle: (vehicleId: string) => "added" | "removed" | "limit";
  clearVehicles: () => void;
}

export const VehicleComparisonContext = createContext<VehicleComparisonContextValue | null>(null);
