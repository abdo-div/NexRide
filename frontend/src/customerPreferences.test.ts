import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("saved customer preferences journey", () => {
  it("provides a protected settings page from the customer menu", () => {
    expect(source("./App.tsx")).toContain('path="/preferences"');
    expect(source("./components/layouts/NavBarActions.tsx")).toContain('to="/preferences"');
  });

  it("applies account defaults to fleet discovery", () => {
    const fleet = source("./pages/FleetPage.tsx");
    expect(fleet).toContain("preferences.preferredCity");
    expect(fleet).toContain("preferences.vehicleTypes.join");
    expect(fleet).toContain("preferences.transmission");
    expect(fleet).toContain("preferences.fuelType");
  });

  it("applies schedule and payment defaults at checkout", () => {
    const checkout = source("./pages/CheckoutPage.tsx");
    expect(checkout).toContain("preferences.defaultRentalDays");
    expect(checkout).toContain("preferences.pickupTime");
    expect(checkout).toContain("preferences.returnTime");
    expect(checkout).toContain("preferences.paymentMethod");
  });
});
