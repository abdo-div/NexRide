import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../lib/adminApi";
import type {
  AdminCompanyDto,
  AdminCustomerDto,
  AdminPaymentDto,
  AdminPayoutRow,
  AdminPayoutSummary,
} from "../types/admin";
import type { BookingDto } from "../types/booking";
import type { VehicleDto } from "../types/vehicle";

export interface AdminCommissionsData {
  payments: AdminPaymentDto[];
  bookings: BookingDto[];
  companies: AdminCompanyDto[];
  customers: AdminCustomerDto[];
  vehicles: VehicleDto[];
  summary: AdminPayoutSummary | null;
  ledger: AdminPayoutRow[];
}

export const EMPTY_COMMISSIONS_DATA: AdminCommissionsData = {
  payments: [],
  bookings: [],
  companies: [],
  customers: [],
  vehicles: [],
  summary: null,
  ledger: [],
};

const EMPTY_RESPONSES = {
  payments: [] as AdminPaymentDto[],
  bookings: [] as BookingDto[],
  companies: [] as AdminCompanyDto[],
  customers: [] as AdminCustomerDto[],
  vehicles: [] as VehicleDto[],
  ledger: [] as AdminPayoutRow[],
};

/**
 * Feeds Commissions & Payouts from the real ledger: the payment register, the
 * renter/flight joins (bookings + partners + vehicles) and the two live payout
 * aggregations (platform summary + per-operator clearing ledger). No client-side
 * mock figures are ever introduced.
 */
export const useAdminCommissions = (): {
  data: AdminCommissionsData;
  loading: boolean;
  error: boolean;
  reload: () => void;
} => {
  const [data, setData] = useState<AdminCommissionsData>(EMPTY_COMMISSIONS_DATA);
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
        const [
          commissionsRes,
          bookingsRes,
          companiesRes,
          customersRes,
          vehiclesRes,
          summaryRes,
          ledgerRes,
        ] = await Promise.all([
          adminApi.listCommissions(controller.signal),
          adminApi.listBookings(controller.signal),
          adminApi.listCompanies(controller.signal),
          adminApi.listCustomers(controller.signal),
          adminApi.listVehicles(controller.signal),
          adminApi.payoutSummary(controller.signal),
          adminApi.payoutLedger(undefined, controller.signal),
        ]);
        if (!active) return;
        setData({
          payments: commissionsRes.data.payments ?? EMPTY_RESPONSES.payments,
          bookings: bookingsRes.data.data ?? EMPTY_RESPONSES.bookings,
          companies: companiesRes.data.companies ?? EMPTY_RESPONSES.companies,
          customers: customersRes.data.users ?? EMPTY_RESPONSES.customers,
          vehicles: vehiclesRes.data.vehicles ?? EMPTY_RESPONSES.vehicles,
          summary: summaryRes.data.summary ?? null,
          ledger: ledgerRes.data.ledger ?? EMPTY_RESPONSES.ledger,
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