import type { VehicleFuelType, VehicleTransmission, VehicleType } from "./vehicle";

export interface CustomerPreferences {
  preferredCity: string;
  vehicleTypes: VehicleType[];
  transmission: "ANY" | VehicleTransmission;
  fuelType: "ANY" | VehicleFuelType;
  defaultRentalDays: number;
  pickupTime: string;
  returnTime: string;
  paymentMethod: "CARD" | "CASH_ON_DELIVERY";
}

export const DEFAULT_CUSTOMER_PREFERENCES: CustomerPreferences = {
  preferredCity: "",
  vehicleTypes: [],
  transmission: "ANY",
  fuelType: "ANY",
  defaultRentalDays: 3,
  pickupTime: "10:00",
  returnTime: "10:00",
  paymentMethod: "CARD",
};
