import { useCallback, useEffect, useMemo, useState } from "react";
import { companyFleetApi } from "../lib/companyFleetApi";
import { EMPTY_PAGINATION } from "./usePaginatedList";
import type {
  CompanyFleetCategory,
  CompanyFleetData,
  CompanyFleetDisplayState,
  CompanyFleetFuel,
  CompanyFleetTransmission,
} from "../types/companyFleet";

export const DEFAULT_FLEET_LIMIT = 7;

const EMPTY: CompanyFleetData = {
  period: { from: null, to: null },
  company: null,
  summary: { total: 0, available: 0, rented: 0, maintenance: 0, draft: 0 },
  list: [],
  pagination: EMPTY_PAGINATION,
};

/**
 * Drives the fleet register straight off the tenant-scoped endpoint. The
 * filter state is held here so the page can re-render the deck, toolbar, table
 * and grid from one response. Every filter change resets to page 1, and the
 * fetch is keyed on the full filter object so stale requests from a previous
 * filter can never overwrite a newer one.
 */
export const useCompanyFleet = () => {
  const [search, setSearchState] = useState("");
  const [status, setStatusState] = useState<CompanyFleetDisplayState | "all">("all");
  const [category, setCategoryState] = useState<CompanyFleetCategory>("all");
  const [transmission, setTransmissionState] = useState<CompanyFleetTransmission>("all");
  const [fuel, setFuelState] = useState<CompanyFleetFuel>("all");
  const [city, setCityState] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_FLEET_LIMIT);
  const [data, setData] = useState<CompanyFleetData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const resetPage = () => setPage(1);

  const setSearch = (next: string) => {
    resetPage();
    setSearchState(next);
  };
  const setStatus = (next: CompanyFleetDisplayState | "all") => {
    resetPage();
    setStatusState(next);
  };
  const setCategory = (next: CompanyFleetCategory) => {
    resetPage();
    setCategoryState(next);
  };
  const setTransmission = (next: CompanyFleetTransmission) => {
    resetPage();
    setTransmissionState(next);
  };
  const setFuel = (next: CompanyFleetFuel) => {
    resetPage();
    setFuelState(next);
  };
  const setCity = (next: string) => {
    resetPage();
    setCityState(next);
  };

  const query = useMemo(
    () => ({ search, status, category, transmission, fuel, city, page, limit }),
    [search, status, category, transmission, fuel, city, page, limit],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await companyFleetApi.list(query, controller.signal);
        if (!active) return;
        setData(response.data ?? EMPTY);
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

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const resetFilters = () => {
    setSearchState("");
    setStatusState("all");
    setCategoryState("all");
    setTransmissionState("all");
    setFuelState("all");
    setCityState("");
    setPage(1);
  };

  return {
    data,
    loading,
    error,
    reload,
    search,
    setSearch,
    status,
    setStatus,
    category,
    setCategory,
    transmission,
    setTransmission,
    fuel,
    setFuel,
    city,
    setCity,
    page,
    setPage,
    limit,
    setLimit,
    resetFilters,
  };
};