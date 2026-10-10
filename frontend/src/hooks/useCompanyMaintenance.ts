import { useCallback, useEffect, useMemo, useState } from "react";
import { companyMaintenanceApi } from "../lib/companyMaintenanceApi";
import { companyFleetApi } from "../lib/companyFleetApi";
import { EMPTY_PAGINATION } from "./usePaginatedList";
import type {
  CreateMaintenancePayload,
  MaintenanceCategory,
  MaintenanceDispatchStatus,
  MaintenanceSummary,
  MaintenanceVehicleOption,
} from "../types/admin";
import type { CompanyMaintenanceData } from "../types/companyMaintenance";

export const DEFAULT_MAINTENANCE_LIMIT = 6;
/** Bound of the fleet registry fetch used to fill the create-event picker. */
const FLEET_REGISTRY_LIMIT = 50;

const EMPTY: CompanyMaintenanceData = {
  events: [],
  pagination: EMPTY_PAGINATION,
};

/**
 * Drives the partner Maintenance & Inspection page. The ledger paging + filter
 * state lives here (mirrors useCompanyFleet), while the Fleet Health summary
 * and the fleet-for-picker registry reload alongside it. Every filter change
 * resets to page 1 and the fetch is keyed on the full filter object so stale
 * requests can never overwrite a newer one.
 */
export const useCompanyMaintenance = () => {
  const [search, setSearchState] = useState("");
  const [status, setStatusState] = useState<MaintenanceDispatchStatus | "ALL">("ALL");
  const [category, setCategoryState] = useState<MaintenanceCategory | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_MAINTENANCE_LIMIT);

  const [data, setData] = useState<CompanyMaintenanceData>(EMPTY);
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null);
  const [fleet, setFleet] = useState<MaintenanceVehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [registryLoading, setRegistryLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const resetPage = () => setPage(1);

  const setSearch = (next: string) => {
    resetPage();
    setSearchState(next);
  };
  const setStatus = (next: MaintenanceDispatchStatus | "ALL") => {
    resetPage();
    setStatusState(next);
  };
  const setCategory = (next: MaintenanceCategory | "ALL") => {
    resetPage();
    setCategoryState(next);
  };

  const query = useMemo(
    () => ({ search, status, category, page, limit }),
    [search, status, category, page, limit],
  );

  // Server-paginated event ledger (search + status + category).
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await companyMaintenanceApi.list(query, controller.signal);
        if (!active) return;
        setData({
          events: response.data?.events ?? EMPTY.events,
          pagination: response.pagination ?? EMPTY_PAGINATION,
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
  }, [query, attempt]);

  // Fleet Health summary + fleet register for the create-event picker.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setRegistryLoading(true);
      try {
        const [summaryRes, fleetRes] = await Promise.all([
          companyMaintenanceApi.summary(controller.signal),
          companyFleetApi.list(
            {
              search: "",
              status: "all",
              category: "all",
              transmission: "all",
              fuel: "all",
              city: "",
              page: 1,
              limit: FLEET_REGISTRY_LIMIT,
            },
            controller.signal,
          ),
        ]);
        if (!active) return;
        setSummary(summaryRes.data?.summary ?? null);
        setFleet(
          (fleetRes.data?.list ?? []).map((v) => ({
            _id: v.id,
            make: v.make,
            model: v.model,
            year: v.year,
            city: v.city,
          })),
        );
      } catch {
        if (!active) return;
        setError(true);
      } finally {
        if (active) setRegistryLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const resetFilters = () => {
    setSearchState("");
    setStatusState("ALL");
    setCategoryState("ALL");
    setPage(1);
  };

  // -------------------------------------------------------------------------
  // Lifecycle mutations (create / complete / release). Return true on success
  // so the page can toast and close its modal.
  // -------------------------------------------------------------------------
  const runMutation = useCallback(
    async (action: () => Promise<unknown>): Promise<boolean> => {
      setBusy(true);
      try {
        await action();
        setAttempt((n) => n + 1);
        return true;
      } catch {
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const create = useCallback(
    (payload: CreateMaintenancePayload) =>
      runMutation(() => companyMaintenanceApi.create(payload)),
    [runMutation],
  );

  const complete = useCallback(
    (id: string) => runMutation(() => companyMaintenanceApi.complete(id)),
    [runMutation],
  );

  const releaseVehicle = useCallback(
    (vehicleId: string) =>
      runMutation(() => companyMaintenanceApi.release(vehicleId)),
    [runMutation],
  );

  return {
    data,
    summary,
    fleet,
    loading: loading || registryLoading,
    error,
    busy,
    reload,
    create,
    complete,
    releaseVehicle,
    search,
    setSearch,
    status,
    setStatus,
    category,
    setCategory,
    page,
    setPage,
    limit,
    setLimit,
    resetFilters,
  };
};