import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { customerPreferencesApi } from "../lib/customerPreferencesApi";
import { DEFAULT_CUSTOMER_PREFERENCES, type CustomerPreferences } from "../types/customerPreferences";
import { CustomerPreferencesContext } from "./customer-preferences-context";
import { useAuth } from "./useAuth";

export const CustomerPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(DEFAULT_CUSTOMER_PREFERENCES);
  const [loading, setLoading] = useState(false);
  const isCustomer = user?.role?.trim() === "customer";

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (!isCustomer) {
        setPreferences(DEFAULT_CUSTOMER_PREFERENCES);
        return;
      }
      setLoading(true);
      try {
        const response = await customerPreferencesApi.get(controller.signal);
        setPreferences({ ...DEFAULT_CUSTOMER_PREFERENCES, ...response.data.preferences });
      } catch (error) {
        if ((error as { name?: string })?.name !== "AbortError") console.error("Unable to load customer preferences", error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    });
    return () => controller.abort();
  }, [isCustomer]);

  const savePreferences = useCallback(async (next: CustomerPreferences) => {
    const response = await customerPreferencesApi.update(next);
    setPreferences({ ...DEFAULT_CUSTOMER_PREFERENCES, ...response.data.preferences });
  }, []);

  const value = useMemo(() => ({ preferences, loading, savePreferences }), [preferences, loading, savePreferences]);
  return <CustomerPreferencesContext.Provider value={value}>{children}</CustomerPreferencesContext.Provider>;
};
