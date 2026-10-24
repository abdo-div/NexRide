import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("saved searches customer journey", () => {
  it("provides a protected manager from the customer navigation", () => {
    expect(source("./App.tsx")).toContain('path="/saved-searches"');
    expect(source("./components/layouts/NavBarActions.tsx")).toContain('to="/saved-searches"');
  });

  it("lets customers save the active fleet filters", () => {
    const fleet = source("./pages/FleetPage.tsx");
    expect(fleet).toContain("savedSearchApi.create");
    expect(fleet).toContain("onSaveSearch");
    expect(fleet).toContain("alertsEnabled");
  });

  it("lets customers rerun searches and manage alerts", () => {
    const manager = source("./pages/SavedSearchesPage.tsx");
    expect(manager).toContain("savedSearchApi.update");
    expect(manager).toContain("savedSearchApi.remove");
    expect(manager).toContain("searchUrl(search)");
  });
});
