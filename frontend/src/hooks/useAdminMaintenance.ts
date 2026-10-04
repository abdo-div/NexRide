import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../lib/adminApi";
import type {
  AdminCompanyDto,
  MaintenanceEventDto,
  MaintenanceSummary,
} from "../types/admin";
import type { VehicleDto } from "../types/vehicle";

export interface AdminMaintenanceData {
  events: MaintenanceEventDto[];
  vehicles: VehicleDto[];
  companies: AdminCompanyDto[];
  summary: MaintenanceSummary | null;
}

export const EMPTY_MAINTENANCE_DATA: AdminMaintenanceData = {
  events: [],
  vehicles: [],
  companies: [],
  summary: null,
};

const EMPTY_RESPONSES = {
  events: [] as MaintenanceEventDto[],
  vehicles: [] as VehicleDto[],
  companies: [] as AdminCompanyDto[],
};

/**
 * Feeds Fleet Maintenance & Quarantine from the real registry: the
 * MaintenanceEvent ledger (with derived OVERDUE dispatch state), the live
 * vehicle + partner registers for the create-event picker, and the Fleet
 * Health summary aggregation. No client-side mock figures are introduced.
 */
export const useAdminMaintenance = (): {
  data: AdminMaintenanceData;
  loading: boolean;
  error: boolean;
  reload: () => void;
} => {
  const [data, setData] = useState<AdminMaintenanceData>(EMPTY_MAINTENANCE_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(false);

      try {
        const [eventsRes, vehiclesRes, companiesRes, summaryRes] =
          await Promise.all([
            adminApi.listMaintenance(controller.signal),
            adminApi.listVehicles(controller.signal),
            adminApi.listCompanies(controller.signal),
            adminApi.maintenanceSummary(controller.signal),
          ]);
        if (!active) return;
        setData({
          events: eventsRes.data.events ?? EMPTY_RESPONSES.events,
          vehicles: vehiclesRes.data.vehicles ?? EMPTY_RESPONSES.vehicles,
          companies: companiesRes.data.companies ?? EMPTY_RESPONSES.companies,
          summary: summaryRes.data.summary ?? null,
        });
      } catch {
        if (!active) return;
        setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { data, loading, error, reload };
};