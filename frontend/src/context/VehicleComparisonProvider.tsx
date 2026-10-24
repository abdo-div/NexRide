import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  MAX_COMPARED_VEHICLES,
  VehicleComparisonContext,
} from "./vehicle-comparison-context";

const STORAGE_KEY = "nexride.comparison.vehicleIds.v1";

const readStoredIds = (): string[] => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))]
      .slice(0, MAX_COMPARED_VEHICLES);
  } catch {
    return [];
  }
};

export const VehicleComparisonProvider = ({ children }: { children: ReactNode }) => {
  const [vehicleIds, setVehicleIds] = useState<string[]>(readStoredIds);

  const update = useCallback((next: string[]) => {
    setVehicleIds(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Comparison still works for the current page when storage is disabled.
    }
  }, []);

  const hasVehicle = useCallback((vehicleId: string) => vehicleIds.includes(vehicleId), [vehicleIds]);
  const addVehicle = useCallback((vehicleId: string) => {
    if (vehicleIds.includes(vehicleId)) return "duplicate" as const;
    if (vehicleIds.length >= MAX_COMPARED_VEHICLES) return "limit" as const;
    update([...vehicleIds, vehicleId]);
    return "added" as const;
  }, [update, vehicleIds]);
  const removeVehicle = useCallback((vehicleId: string) => {
    update(vehicleIds.filter((id) => id !== vehicleId));
  }, [update, vehicleIds]);
  const toggleVehicle = useCallback((vehicleId: string) => {
    if (vehicleIds.includes(vehicleId)) {
      removeVehicle(vehicleId);
      return "removed" as const;
    }
    const result = addVehicle(vehicleId);
    return result === "added" ? "added" as const : "limit" as const;
  }, [addVehicle, removeVehicle, vehicleIds]);
  const clearVehicles = useCallback(() => update([]), [update]);

  const value = useMemo(() => ({
    vehicleIds,
    hasVehicle,
    addVehicle,
    removeVehicle,
    toggleVehicle,
    clearVehicles,
  }), [vehicleIds, hasVehicle, addVehicle, removeVehicle, toggleVehicle, clearVehicles]);

  return <VehicleComparisonContext.Provider value={value}>{children}</VehicleComparisonContext.Provider>;
};
