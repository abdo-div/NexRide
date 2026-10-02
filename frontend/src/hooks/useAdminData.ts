import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../lib/adminApi";
import type { AdminCompanyDto } from "../types/admin";
import type { AdminPaymentDto } from "../types/admin";
import type { BookingDto } from "../types/booking";
import type { VehicleDto } from "../types/vehicle";

export interface AdminData {
  bookings: BookingDto[];
  vehicles: VehicleDto[];
  companies: AdminCompanyDto[];
  payments: AdminPaymentDto[];
}

export const EMPTY_DATA: AdminData = {
  bookings: [],
  vehicles: [],
  companies: [],
  payments: [],
};

const EMPTY_RESPONSES = {
  bookings: [] as BookingDto[],
  vehicles: [] as VehicleDto[],
  companies: [] as AdminCompanyDto[],
  payments: [] as AdminPaymentDto[],
};

/**
 * Pulls the four admin listings in parallel (each capped at 100 rows by the
 * backend's safePagination). No client-side mock data is ever introduced —
 * everything renders from these responses. Mirrors the useHomeData fetch
 * pattern (function defined inside the effect) so React 19 lint stays green.
 */
export const useAdminData = (): {
  data: AdminData;
  loading: boolean;
  error: boolean;
  reload: () => void;
} => {
  const [data, setData] = useState<AdminData>(EMPTY_DATA);
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
        const [bookingsRes, vehiclesRes, companiesRes, commissionsRes] =
          await Promise.all([
            adminApi.listBookings(controller.signal),
            adminApi.listVehicles(controller.signal),
            adminApi.listCompanies(controller.signal),
            adminApi.listCommissions(controller.signal),
          ]);
        if (!active) return;
        setData({
          bookings: bookingsRes.data.data ?? EMPTY_RESPONSES.bookings,
          vehicles: vehiclesRes.data.vehicles ?? EMPTY_RESPONSES.vehicles,
          companies: companiesRes.data.companies ?? EMPTY_RESPONSES.companies,
          payments: commissionsRes.data.payments ?? EMPTY_RESPONSES.payments,
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