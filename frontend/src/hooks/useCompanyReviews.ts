import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../lib/apiClient";
import { companyReviewsApi } from "../lib/companyReviewsApi";
import { EMPTY_PAGINATION } from "./usePaginatedList";
import type {
  CompanyReviewsData,
  CompanyReviewPeriodFilter,
  CompanyReviewStatusFilter,
} from "../types/companyReviews";

export const DEFAULT_REVIEWS_LIMIT = 8;

const EMPTY: CompanyReviewsData = {
  company: null,
  summary: {
    total: 0,
    avg: null,
    verified: 0,
    vehicles: 0,
    thisMonth: 0,
    previousMonth: 0,
    monthChangePct: null,
    avgDelta: null,
    responded: 0,
    awaiting: 0,
    responseRatePct: null,
    avgResponseHours: null,
  },
  distribution: [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: 0,
    percent: 0,
  })),
  trend: [],
  leaderboard: [],
  vehicles: [],
  list: [],
  pagination: EMPTY_PAGINATION,
};

export interface ReviewMutationResult {
  ok: boolean;
  message: string;
}

const errorMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : error instanceof Error ? error.message : "";

/**
 * Drives the partner Reviews & Ratings workspace. The analytics deck is always
 * the tenant's full review set; the register page is re-fetched on every
 * filter change (keyed on the whole filter object so a stale response can
 * never overwrite a newer one). `reply` persists a public reply and reloads so
 * the deck response-rate numbers stay in sync.
 */
export const useCompanyReviews = () => {
  const [star, setStarState] = useState<number | "all">("all");
  const [vehicleId, setVehicleIdState] = useState("");
  const [status, setStatusState] = useState<CompanyReviewStatusFilter>("all");
  const [period, setPeriodState] = useState<CompanyReviewPeriodFilter>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_REVIEWS_LIMIT);
  const [data, setData] = useState<CompanyReviewsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const resetPage = () => setPage(1);

  const setStar = (next: number | "all") => {
    resetPage();
    setStarState(next);
  };
  const setVehicleId = (next: string) => {
    resetPage();
    setVehicleIdState(next);
  };
  const setStatus = (next: CompanyReviewStatusFilter) => {
    resetPage();
    setStatusState(next);
  };
  const setPeriod = (next: CompanyReviewPeriodFilter) => {
    resetPage();
    setPeriodState(next);
  };

  const query = useMemo(
    () => ({ star, vehicleId, status, period, page, limit }),
    [star, vehicleId, status, period, page, limit],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await companyReviewsApi.get(query, controller.signal);
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
    setStarState("all");
    setVehicleIdState("");
    setStatusState("all");
    setPeriodState("all");
    setPage(1);
  };

  const reply = useCallback(
    async (reviewId: string, response: string): Promise<ReviewMutationResult> => {
      setReplyingId(reviewId);
      try {
        await companyReviewsApi.reply(reviewId, response);
        setAttempt((n) => n + 1);
        return { ok: true, message: "" };
      } catch (error) {
        return { ok: false, message: errorMessage(error) };
      } finally {
        setReplyingId(null);
      }
    },
    [],
  );

  return {
    data,
    loading,
    error,
    reload,
    star,
    setStar,
    vehicleId,
    setVehicleId,
    status,
    setStatus,
    period,
    setPeriod,
    page,
    setPage,
    limit,
    setLimit,
    resetFilters,
    replyingId,
    reply,
  };
};