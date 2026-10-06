import { useCallback, useEffect, useState } from "react";
import { companyVehicleApi } from "../lib/companyVehicleApi";
import { EMPTY_PAGINATION } from "./usePaginatedList";
import type { CompanyVehicleData } from "../types/companyVehicle";

export const DEFAULT_VEHICLE_TRIPS_LIMIT = 8;

const EMPTY: CompanyVehicleData = {
  company: null,
  vehicle: {
    id: "",
    code: "",
    make: "",
    model: "",
    year: null,
    type: null,
    transmission: null,
    fuelType: null,
    seats: null,
    doors: null,
    dailyPrice: 0,
    weeklyPrice: null,
    city: null,
    pickupLocation: null,
    operationalStatus: "AVAILABLE",
    listingStatus: "DRAFT",
    rating: { average: null, count: 0 },
    gpsActive: false,
    coordinates: null,
    photo: null,
    photos: [],
    description: null,
    createdAt: null,
    displayStatus: "draft",
  },
  metrics: {
    bookings: { total: 0, completed: 0, upcoming: 0 },
    financial: { revenue: 0, trips: 0 },
    utilization: { pct: 0, daysRented: 0, windowDays: 30 },
    rentalDays: 0,
    onRoad: false,
  },
  calendar: { year: 0, month: 1, label: "", bookedDates: [] },
  nextDispatch: null,
  trips: { list: [], pagination: EMPTY_PAGINATION },
};

/**
 * Loads one vehicle's dossier (GET /companies/fleet/:vehicleId) together with
 * its own booking-history page. The trips query state (search & page) lives
 * here so the page can render the dossier header and the booking table from a
 * single response. Changing the vehicle id resets the paging and refetches,
 * and stale requests are aborted so an old vehicle can never flash in after
 * the user navigated away.
 */
export const useCompanyVehicle = (vehicleId: string) => {
  const [search, setSearchState] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_VEHICLE_TRIPS_LIMIT);
  const [data, setData] = useState<CompanyVehicleData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Reset the paging when the caller navigates to a different vehicle. React's
  // documented "adjust state during render" pattern keeps the reset in sync
  // with the changed prop instead of cascading setState inside an effect.
  const [prevVehicleId, setPrevVehicleId] = useState(vehicleId);
  if (vehicleId !== prevVehicleId) {
    setPrevVehicleId(vehicleId);
    setSearchState("");
    setPage(1);
    setData(EMPTY);
  }

  const setSearch = (next: string) => {
    setPage(1);
    setSearchState(next);
  };

  useEffect(() => {
    if (!vehicleId) return;

    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await companyVehicleApi.detail(
          vehicleId,
          { search, page, limit },
          controller.signal,
        );
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
  }, [vehicleId, search, page, limit, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    data,
    loading,
    error,
    reload,
    search,
    setSearch,
    page,
    setPage,
    limit,
    setLimit,
  };
};