import { useCallback, useEffect, useState } from "react";
import { vehicleApi } from "../lib/vehicleApi";
import type { VehicleSearchArgs } from "../lib/vehicleApi";
import { ApiError } from "../lib/apiClient";
import type { VehicleDto } from "../types/vehicle";

export interface VehiclesState {
  vehicles: VehicleDto[];
  loading: boolean;
  error: string | null;
  /** Re-issues the request; used by the error state's retry button. */
  reload: () => void;
}

/**
 * Loads the fleet using the customer search endpoint. `args` map directly to
 * the backend query (location, vehicle type, price, date availability) so the
 * returned list is already filtered by real booking availability. The effect
 * re-runs whenever any search argument changes.
 */
export const useVehicles = (args: VehicleSearchArgs = {}): VehiclesState => {
  const { location, type, minPrice, maxPrice, startDate, endDate } = args;
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await vehicleApi.search(
          { location, type, minPrice, maxPrice, startDate, endDate },
          controller.signal,
        );
        if (!active) return;
        setVehicles(response.data.vehicles ?? []);
      } catch (err) {
        if (!active) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setVehicles([]);
        setError(
          err instanceof ApiError
            ? err.message
            : "Something went wrong while loading the fleet.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt, location, type, minPrice, maxPrice, startDate, endDate]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { vehicles, loading, error, reload };
};