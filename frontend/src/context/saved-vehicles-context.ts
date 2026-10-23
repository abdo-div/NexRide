import { createContext } from "react";
import type { VehicleDto } from "../types/vehicle";

export interface SavedVehiclesContextValue {
  favorites: VehicleDto[];
  recentlyViewed: VehicleDto[];
  favoriteIds: ReadonlySet<string>;
  loading: boolean;
  toggleFavorite: (vehicleId: string) => Promise<boolean>;
  recordView: (vehicleId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const SavedVehiclesContext = createContext<SavedVehiclesContextValue | null>(null);
