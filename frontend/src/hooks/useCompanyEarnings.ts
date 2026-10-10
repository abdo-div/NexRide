import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { companyEarningsApi } from "../lib/companyEarningsApi";
import { EMPTY_PAGINATION } from "./usePaginatedList";
import type {
  CompanyEarningsData,
  EarningsChartRange,
  EarningsMethodFilter,
  EarningsRangeFilter,
  EarningsStatusFilter,
} from "../types/companyEarnings";

export const DEFAULT_EARNINGS_LIMIT = 8;

const EMPTY: CompanyEarningsData = {
  company: null,
  range: { code: "thisMonth", from: null, to: null },
  settings: { payoutSchedule: "Weekly on Thursdays", clearingBank: "Libyan Foreign Bank (LFB)" },
  summary: {
    gross: 0,
    bookings: 0,
    platformTake: 0,
    companyEarnings: 0,
    effectiveRate: 0,
    grossDeltaPct: null,
    available: 0,
    inEscrow: 0,
    disbursed: 0,
  },
  chart: { range: "30d", buckets: [], avgTakePerDay: 0, topWindow: null },
  topVehicles: [],
  mix: [],
  vehicles: [],
  list: [],
  pagination: EMPTY_PAGINATION,
};

/**
 * Drives the partner Earnings & Transactions workspace. The analytical deck
 * (KPIs, waterfall, settlements, vehicles, chart) always reflects the tenant's
 * whole ledger within the selected date range; search / status / vehicle /
 * method only reshape the register page — every fetch is keyed on the full
 * filter object so a stale response can never overwrite a newer one.
 *
 * The search box is debounced so keystrokes do not hammer the ledger endpoint.
 */
export const useCompanyEarnings = () => {
  const [range, setRangeState] = useState<EarningsRangeFilter>("thisMonth");
  const [chartRange, setChartRange] = useState<EarningsChartRange>("30d");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatusState] = useState<EarningsStatusFilter>("all");
  const [vehicleId, setVehicleIdState] = useState("");
  const [method, setMethodState] = useState<EarningsMethodFilter>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_EARNINGS_LIMIT);
  const [data, setData] = useState<CompanyEarningsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const debounceRef = useRef<number | undefined>(undefined);

  const resetPage = () => setPage(1);

  const setRange = (next: EarningsRangeFilter) => {
    resetPage();
    setRangeState(next);
  };
  const setStatus = (next: EarningsStatusFilter) => {
    resetPage();
    setStatusState(next);
  };
  const setVehicleId = (next: string) => {
    resetPage();
    setVehicleIdState(next);
  };
  const setMethod = (next: EarningsMethodFilter) => {
    resetPage();
    setMethodState(next);
  };

  const setSearchDraftSafe = (next: string) => {
    setSearchDraft(next);
    resetPage();
  };

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setSearch(searchDraft.trim()), 450);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [searchDraft]);

  const query = useMemo(
    () => ({ range, chartRange, search, status, vehicleId, method, page, limit }),
    [range, chartRange, search, status, vehicleId, method, page, limit],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await companyEarningsApi.get(query, controller.signal);
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
    setSearchDraft("");
    setSearch("");
    setStatusState("all");
    setVehicleIdState("");
    setMethodState("all");
    setPage(1);
  };

  return {
    data,
    loading,
    error,
    reload,
    range,
    setRange,
    chartRange,
    setChartRange,
    searchDraft,
    setSearch: setSearchDraftSafe,
    status,
    setStatus,
    vehicleId,
    setVehicleId,
    method,
    setMethod,
    page,
    setPage,
    limit,
    setLimit,
    resetFilters,
  };
};