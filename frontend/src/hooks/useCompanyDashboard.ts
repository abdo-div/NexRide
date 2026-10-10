import { useCallback, useEffect, useState } from "react";
import { companyDashboardApi } from "../lib/companyDashboardApi";
import type {
  CompanyDashboardData,
  CompanyDashboardPeriod,
} from "../types/companyDashboard";

export const DEFAULT_PERIOD: CompanyDashboardPeriod = "30d";

const EMPTY: CompanyDashboardData = {
  period: { from: "", to: "", label: DEFAULT_PERIOD },
  company: null,
  kpis: {
    totalVehicles: 0,
    totalPublished: 0,
    onRoad: 0,
    upcoming: 0,
    pendingPayout: 0,
    pendingPayoutCount: 0,
    revenueGross: 0,
    revenueNet: 0,
    revenueDeltaPct: null,
  },
  revenueSeries: [],
  financial: {
    gross: 0,
    cut: 0,
    net: 0,
    tx: 0,
    avgTicket: 0,
    takeRatePct: 0,
    avgDailyEarning: 0,
    periodDays: 0,
  },
  fleet: {
    total: 0,
    available: 0,
    onRoad: 0,
    maintenance: 0,
    scheduled: 0,
    published: 0,
    utilizationPct: 0,
  },
  upcomingBookings: [],
  activity: [],
  performance: {
    bookingsThisMonth: 0,
    bookingsPrevMonth: 0,
    bookingsDeltaPct: null,
    fulfillmentRate: 0,
    cancellationRate: 0,
    avgBookingValue: 0,
    completedCount: 0,
    avgRating: 0,
    reviews: 0,
  },
};

/**
 * Loads the tenant-scoped company dashboard for the active rolling window and
 * re-fetches it whenever the window changes. No client-side mock data is ever
 * introduced — the page renders strictly from the aggregation response.
 * Mirrors the useAdminData fetch pattern (function defined inside the effect)
 * so React 19 lint stays green.
 */
export const useCompanyDashboard = (): {
  data: CompanyDashboardData;
  period: CompanyDashboardPeriod;
  setPeriod: (period: CompanyDashboardPeriod) => void;
  loading: boolean;
  error: boolean;
  reload: () => void;
} => {
  const [period, setPeriod] = useState<CompanyDashboardPeriod>(DEFAULT_PERIOD);
  const [data, setData] = useState<CompanyDashboardData>(EMPTY);
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
        const response = await companyDashboardApi.summary(period, controller.signal);
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
  }, [period, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { data, period, setPeriod, loading, error, reload };
};