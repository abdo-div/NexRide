import { createContext } from "react";
import type { CustomerPreferences } from "../types/customerPreferences";

export interface CustomerPreferencesContextValue {
  preferences: CustomerPreferences;
  loading: boolean;
  savePreferences: (preferences: CustomerPreferences) => Promise<void>;
}

export const CustomerPreferencesContext = createContext<CustomerPreferencesContextValue | null>(null);
