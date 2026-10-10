import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../lib/adminApi";
import type { ReportPeriod, ReportsSummary } from "../types/admin";

/**
 * Feeds Reports & Analytics from the live /admin/reports/summary aggregation.
 * The window (`period`) and dispatch hub are passed straight through, so every
 * KPI, chart bucket and ranking the page renders is computed server-side from
 * the real Booking/Payment registries.
 */
export const useAdminReports = (
  period: ReportPeriod,
  hub: string,
): {
  summary: ReportsSummary | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
} => {
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
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
        const res = await adminApi.analyticsSummary(period, hub, controller.signal);
        if (!active) return;
        setSummary(res.data.summary ?? null);
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
  }, [period, hub, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { summary, loading, error, reload };
};