import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { customerVehicleActivityApi } from "../lib/customerVehicleActivityApi";
import type { VehicleDto } from "../types/vehicle";
import { SavedVehiclesContext } from "./saved-vehicles-context";
import { useAuth } from "./useAuth";

export const SavedVehiclesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<VehicleDto[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<VehicleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const isCustomer = user?.role?.trim() === "customer";

  const refresh = useCallback(async () => {
    if (!isCustomer) {
      setFavorites([]);
      setRecentlyViewed([]);
      return;
    }
    setLoading(true);
    try {
      const response = await customerVehicleActivityApi.list();
      setFavorites(response.data.favorites);
      setRecentlyViewed(response.data.recentlyViewed);
    } finally {
      setLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    // Defer the initial state transition to the microtask queue. The effect is
    // responsible for synchronising the account with the API; state updates
    // happen only after that external synchronisation begins.
    void Promise.resolve()
      .then(refresh)
      .catch((error) => console.error("Unable to load saved vehicles", error));
  }, [refresh]);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((vehicle) => vehicle._id ?? vehicle.id ?? "")),
    [favorites],
  );

  const toggleFavorite = useCallback(async (vehicleId: string) => {
    const next = !favoriteIds.has(vehicleId);
    await customerVehicleActivityApi.setFavorite(vehicleId, next);
    await refresh();
    return next;
  }, [favoriteIds, refresh]);

  const recordView = useCallback(async (vehicleId: string) => {
    if (!isCustomer) return;
    await customerVehicleActivityApi.recordView(vehicleId);
    await refresh();
  }, [isCustomer, refresh]);

  const value = useMemo(() => ({
    favorites,
    recentlyViewed,
    favoriteIds,
    loading,
    toggleFavorite,
    recordView,
    refresh,
  }), [favorites, recentlyViewed, favoriteIds, loading, toggleFavorite, recordView, refresh]);

  return <SavedVehiclesContext.Provider value={value}>{children}</SavedVehiclesContext.Provider>;
};
