import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_COMPARED_VEHICLES } from "./context/vehicle-comparison-context";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("vehicle comparison journey", () => {
  it("limits the shortlist to three browser-persisted vehicles", () => {
    expect(MAX_COMPARED_VEHICLES).toBe(3);
    const provider = source("./context/VehicleComparisonProvider.tsx");
    expect(provider).toContain("localStorage.setItem");
    expect(provider).toContain("vehicleIds.length >= MAX_COMPARED_VEHICLES");
  });

  it("exposes comparison from the fleet and detail page", () => {
    expect(source("./components/vehicles/VehicleCard.tsx")).toContain("toggleVehicle(vehicle.id)");
    expect(source("./pages/VehicleDetailPage.tsx")).toContain("toggleVehicle(vehicleId)");
  });

  it("loads fresh vehicle data on a dedicated comparison route", () => {
    const app = source("./App.tsx");
    const page = source("./pages/VehicleComparisonPage.tsx");
    expect(app).toContain('path="/compare"');
    expect(app).toContain("<ComparisonTray />");
    expect(page).toContain("vehicleApi.getById(id, signal)");
    expect(page).toContain("removeVehicle(vehicle._id)");
  });
});
