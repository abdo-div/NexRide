import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("saved vehicle customer journey", () => {
  it("provides a protected management route and account menu link", () => {
    const app = source("./App.tsx");
    const nav = source("./components/layouts/NavBarActions.tsx");
    expect(app).toContain('path="/saved-vehicles"');
    expect(app).toContain("<SavedVehiclesProvider>");
    expect(nav).toContain('to="/saved-vehicles"');
  });

  it("uses account-backed state on fleet cards and detail views", () => {
    expect(source("./components/vehicles/VehicleCard.tsx")).toContain("toggleFavorite(vehicle.id)");
    expect(source("./components/home/TrendingCard.tsx")).toContain("toggleFavorite(car.id)");
    const detail = source("./pages/VehicleDetailPage.tsx");
    expect(detail).toContain("recordView(vehicleId)");
    expect(detail).toContain("toggleFavorite(vehicleId)");
  });
});
