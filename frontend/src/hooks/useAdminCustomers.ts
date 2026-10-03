import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../lib/adminApi";
import type {
  AdminCompanyDto,
  AdminCustomerDto,
  AdminPaymentDto,
} from "../types/admin";
import type { BookingDto } from "../types/booking";
import type { VehicleDto } from "../types/vehicle";

export interface AdminCustomersData {
  customers: AdminCustomerDto[];
  bookings: BookingDto[];
  vehicles: VehicleDto[];
  companies: AdminCompanyDto[];
  payments: AdminPaymentDto[];
}

export const EMPTY_CUSTOMERS_DATA: AdminCustomersData = {
  customers: [],
  bookings: [],
  vehicles: [],
  companies: [],
  payments: [],
};

const EMPTY_RESPONSES = {
  customers: [] as AdminCustomerDto[],
  bookings: [] as BookingDto[],
  vehicles: [] as VehicleDto[],
  companies: [] as AdminCompanyDto[],
  payments: [] as AdminPaymentDto[],
};

/**
 * Pulls the registered renter accounts (role=customer) in parallel with the
 * shared admin datasets used to derive each customer's real activity (bookings,
 * payments, fleet). No client-side mock data is ever introduced.
 */
export const useAdminCustomers = (): {
  data: AdminCustomersData;
  loading: boolean;
  error: boolean;
  reload: () => void;
} => {
  const [data, setData] = useState<AdminCustomersData>(EMPTY_CUSTOMERS_DATA);
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
        const [customersRes, bookingsRes, vehiclesRes, companiesRes, commissionsRes] =
          await Promise.all([
            adminApi.listCustomers(controller.signal),
            adminApi.listBookings(controller.signal),
            adminApi.listVehicles(controller.signal),
            adminApi.listCompanies(controller.signal),
            adminApi.listCommissions(controller.signal),
          ]);
        if (!active) return;
        setData({
          customers: customersRes.data.users ?? EMPTY_RESPONSES.customers,
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