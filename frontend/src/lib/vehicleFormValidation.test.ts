import { describe, expect, it } from "vitest";
import { validateVehicleDraft } from "./vehicleFormValidation";
import type { CompanyVehicleEditDraft } from "../hooks/useCompanyVehicleEditForm";

const valid: CompanyVehicleEditDraft = {
  make: "Toyota", model: "Camry", year: "2025", type: "SEDAN", transmission: "AUTOMATIC",
  fuelType: "GASOLINE", seats: "5", doors: "4", description: "", dailyPrice: "250",
  weeklyPrice: "1500", city: "Tripoli", pickupLocation: "Airport", plateNumber: "",
  vin: "", odometer: "", engine: "", drivetrain: "", exteriorColor: "", interiorColor: "",
  tankCapacity: "", features: "", monthlyPrice: "", depositAmount: "0", mileageLimit: "",
  extraMileageFee: "", lng: "", lat: "",
};

describe("vehicle form validation", () => {
  it("accepts a complete valid vehicle", () => expect(validateVehicleDraft(valid)).toEqual({}));
  it("returns inline errors for missing and invalid publish fields", () => {
    const errors = validateVehicleDraft({ ...valid, make: "", year: "1800", dailyPrice: "0", vin: "ABC" });
    expect(errors.make).toBe("company.vehicleValidation.required");
    expect(errors.year).toBe("company.vehicleValidation.year");
    expect(errors.dailyPrice).toBe("company.vehicleValidation.price");
    expect(errors.vin).toBe("company.vehicleValidation.vin");
  });
});
