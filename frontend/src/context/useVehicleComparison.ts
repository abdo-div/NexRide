import { useContext } from "react";
import { VehicleComparisonContext } from "./vehicle-comparison-context";

export const useVehicleComparison = () => {
  const context = useContext(VehicleComparisonContext);
  if (!context) throw new Error("useVehicleComparison must be used within VehicleComparisonProvider");
  return context;
};
