import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../lib/apiClient";
import { vehicleApi } from "../lib/vehicleApi";
import type { VehicleDto } from "../types/vehicle";

/**
 * "static" is returned when the id belongs to the placeholder fleet (MOCK
 * vehicles) so the existing static detail template keeps working for the mock
 * checkout flow. Every other id is fetched from GET /vehicles/:id.
 */
export type VehicleDetailStatus = "loading" | "ready" | "error" | "notfound" | "static";

export interface UseVehicleDetail {
  status: VehicleDetailStatus;
  vehicle: VehicleDto | null;
  similar: VehicleDto[];
  error: string;
  reload: () => void;
}

export const useVehicleDetail = (
  vehicleId: string | undefined,
  skip: boolean,
): UseVehicleDetail => {
  const [vehicle, setVehicle] = useState<VehicleDto | null>(null);
  const [similar, setSimilar] = useState<VehicleDto[]>([]);
  const [loadState, setLoadState] = useState<Exclude<VehicleDetailStatus, "static">>("loading");
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  const staticMode = skip || !vehicleId;

  useEffect(() => {
    if (staticMode) return;

    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoadState("loading");
      setVehicle(null);
      setSimilar([]);
      setError("");

      try {
        const result = await vehicleApi.getById(vehicleId, controller.signal);
        if (!active) return;
        const dto = result.data.vehicle;
        setVehicle(dto);

        try {
          const matched = await vehicleApi.listSimilar(dto.type, controller.signal);
          if (active) {
            setSimilar(matched.data.vehicles.filter((entry) => entry._id !== dto._id).slice(0, 2));
          }
        } catch {
          // Similar vehicles are a nice-to-have; a failure must not break the page.
        }

        setLoadState("ready");
      } catch (err) {
        if (!active) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof ApiError && err.status === 404) {
          setLoadState("notfound");
          return;
        }
        setError(err instanceof Error ? err.message : "Something went wrong");
        setLoadState("error");
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [vehicleId, staticMode, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { status: staticMode ? "static" : loadState, vehicle, similar, error, reload };
};