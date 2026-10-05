import { useCallback, useEffect, useState } from "react";
import type { PaginationMeta } from "../types/admin";

/** Fallback used before the first response arrives, so nothing renders "NaN". */
export const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export interface PaginatedList<T> {
  rows: T[];
  pagination: PaginationMeta;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

/**
 * Drives one admin listing from the server.
 *
 * The rows returned are exactly the page the backend selected — this hook never
 * filters, sorts or slices them, so the table, the "showing X of Y" caption and
 * the navigation buttons are all driven by the same server truth.
 *
 * `queryKey` participates in the dependency list so callers can hand over a
 * plain object of filters; a new identity re-runs the fetch.
 */
export const usePaginatedList = <T,>(
  fetcher: (signal: AbortSignal) => Promise<{ rows: T[]; pagination: PaginationMeta }>,
  queryKey: unknown,
): PaginatedList<T> => {
  const [rows, setRows] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
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
        const result = await fetcher(controller.signal);
        if (!active) return;
        setRows(result.rows);
        setPagination(result.pagination);
      } catch {
        if (!active) return;
        setError(true);
        setRows([]);
        setPagination(EMPTY_PAGINATION);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { rows, pagination, loading, error, reload };
};
