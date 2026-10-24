import { useContext } from "react";
import { SavedVehiclesContext } from "./saved-vehicles-context";

export const useSavedVehicles = () => {
  const context = useContext(SavedVehiclesContext);
  if (!context) throw new Error("useSavedVehicles must be used within SavedVehiclesProvider");
  return context;
};
