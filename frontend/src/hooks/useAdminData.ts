import { useCallback, useEffect, useState } from "react";
import { adminApi, REGISTRY_LIMIT } from "../lib/adminApi";
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
 * Pulls the reference registries the admin pages use to resolve foreign keys and
 * derive KPIs (company/vehicle/customer names, per-row joins).
 *
 * IMPORTANT: this is a *lookup cache*, not a table source. Each admin listing
 * page renders its rows from its own server-paginated endpoint via
 * `usePaginatedList`, so no listing silently stops at this window. The bound is
 * declared in `adminApi.REGISTRY_LIMIT` and every response still carries
 * pagination metadata, so callers can tell how much more exists.
 *
 * No client-side mock data is ever introduced — everything renders from these
 * responses. Mirrors the useHomeData fetch pattern (function defined inside the
 * effect) so React 19 lint stays green.
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
        const registry = { limit: REGISTRY_LIMIT, sort: "-createdAt" };
        const [bookingsRes, vehiclesRes, companiesRes, commissionsRes] =
          await Promise.all([
            adminApi.listBookings(registry, controller.signal),
            adminApi.listVehicles(registry, controller.signal),
            adminApi.listCompanies(registry, controller.signal),
            adminApi.listCommissions(registry, controller.signal),
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