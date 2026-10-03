import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../lib/adminApi";
import type {
  AdminCompanyDto,
  AdminCustomerDto,
  AdminPaymentDto,
} from "../types/admin";
import type { BookingDto } from "../types/booking";
import type { VehicleDto } from "../types/vehicle";

export interface AdminPaymentsData {
  payments: AdminPaymentDto[];
  bookings: BookingDto[];
  customers: AdminCustomerDto[];
  companies: AdminCompanyDto[];
  vehicles: VehicleDto[];
}

export const EMPTY_PAYMENTS_DATA: AdminPaymentsData = {
  payments: [],
  bookings: [],
  customers: [],
  companies: [],
  vehicles: [],
};

const EMPTY_RESPONSES = {
  payments: [] as AdminPaymentDto[],
  bookings: [] as BookingDto[],
  customers: [] as AdminCustomerDto[],
  companies: [] as AdminCompanyDto[],
  vehicles: [] as VehicleDto[],
};

/**
 * Pulls the real payment ledger in parallel with the renter registry, bookings,
 * fleet partners and vehicles — used to join unpopulated payment refs. No
 * client-side mock data is ever introduced.
 */
export const useAdminPayments = (): {
  data: AdminPaymentsData;
  loading: boolean;
  error: boolean;
  reload: () => void;
} => {
  const [data, setData] = useState<AdminPaymentsData>(EMPTY_PAYMENTS_DATA);
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
        const [commissionsRes, bookingsRes, customersRes, companiesRes, vehiclesRes] =
          await Promise.all([
            adminApi.listCommissions(controller.signal),
            adminApi.listBookings(controller.signal),
            adminApi.listCustomers(controller.signal),
            adminApi.listCompanies(controller.signal),
            adminApi.listVehicles(controller.signal),
          ]);
        if (!active) return;
        setData({
          payments: commissionsRes.data.payments ?? EMPTY_RESPONSES.payments,
          bookings: bookingsRes.data.data ?? EMPTY_RESPONSES.bookings,
          customers: customersRes.data.users ?? EMPTY_RESPONSES.customers,
          companies: companiesRes.data.companies ?? EMPTY_RESPONSES.companies,
          vehicles: vehiclesRes.data.vehicles ?? EMPTY_RESPONSES.vehicles,
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