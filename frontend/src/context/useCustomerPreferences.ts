import { useContext } from "react";
import { CustomerPreferencesContext } from "./customer-preferences-context";

export const useCustomerPreferences = () => {
  const context = useContext(CustomerPreferencesContext);
  if (!context) throw new Error("useCustomerPreferences must be used within CustomerPreferencesProvider");
  return context;
};
