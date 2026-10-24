import { request } from "./apiClient";
import type { VehicleDto } from "../types/vehicle";

export interface CustomerVehicleActivity {
  favorites: VehicleDto[];
  recentlyViewed: VehicleDto[];
}

export const customerVehicleActivityApi = {
  list: (signal?: AbortSignal) =>
    request<{ status: string; data: CustomerVehicleActivity }>(
      "/customer-vehicle-activity",
      { signal },
    ),
  setFavorite: (vehicleId: string, favorite: boolean) =>
    request<{ status: string; data: { vehicleId: string; favorite: boolean } }>(
      `/customer-vehicle-activity/${encodeURIComponent(vehicleId)}/favorite`,
      { method: "PATCH", body: { favorite } },
    ),
  recordView: (vehicleId: string) =>
    request<void>(
      `/customer-vehicle-activity/${encodeURIComponent(vehicleId)}/view`,
      { method: "POST" },
    ),
};
