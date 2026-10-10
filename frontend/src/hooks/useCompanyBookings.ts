import { useCallback, useEffect, useMemo, useState } from "react";
import { companyBookingsApi } from "../lib/companyBookingsApi";
import { EMPTY_PAGINATION } from "./usePaginatedList";
import type {
  CompanyBookingsData,
  CompanyBookingsStatus,
  CompanyBookingsView,
  CompanyPaymentState,
} from "../types/companyBookings";

export const DEFAULT_BOOKINGS_LIMIT = 10;

const EMPTY: CompanyBookingsData = {
  period: { from: null, to: null },
  company: null,
  summary: {
    total: 0,
    pending: 0,
    confirmed: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    upcoming: 0,
    handover: 0,
  },
  vehicles: [],
  list: [],
  pagination: EMPTY_PAGINATION,
};

/**
 * Drives the bookings & dispatches register straight off the tenant-scoped
 * endpoint. The filter state is held here so the page can re-render the whole
 * workspace (deck, tabs, table, drawer) from one response; every filter change
 * resets to page 1, and the fetch is keyed on the full filter object so stale
 * requests from a previous filter can never overwrite a newer one.
 */
export const useCompanyBookings = () => {
  const [view, setViewState] = useState<CompanyBookingsView>("ALL");
  const [search, setSearchState] = useState("");
  const [status, setStatus] = useState<CompanyBookingsStatus | "ALL">("ALL");
  const [payment, setPayment] = useState<CompanyPaymentState | "ALL">("ALL");
  const [vehicleId, setVehicleIdState] = useState("");
  const [fromDate, setFromDateState] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_BOOKINGS_LIMIT);
  const [data, setData] = useState<CompanyBookingsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const resetPage = () => setPage(1);

  const setView = (next: CompanyBookingsView) => {
    resetPage();
    setViewState(next);
  };
  const setSearch = (next: string) => {
    resetPage();
    setSearchState(next);
  };
  const setVehicleId = (next: string) => {
    resetPage();
    setVehicleIdState(next);
  };
  const setFromDate = (next: string) => {
    resetPage();
    setFromDateState(next);
  };

  const query = useMemo(
    () => ({ view, search, status, payment, vehicleId, fromDate, page, limit }),
    [view, search, status, payment, vehicleId, fromDate, page, limit],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await companyBookingsApi.list(query, controller.signal);
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
    setStatus("ALL");
    setPayment("ALL");
    setVehicleIdState("");
    setFromDateState("");
    setViewState("ALL");
    setPage(1);
  };

  return {
    data,
    loading,
    error,
    reload,
    view,
    setView,
    search,
    setSearch,
    status,
    setStatus,
    payment,
    setPayment,
    vehicleId,
    setVehicleId,
    fromDate,
    setFromDate,
    page,
    setPage,
    limit,
    setLimit,
    resetFilters,
  };
};