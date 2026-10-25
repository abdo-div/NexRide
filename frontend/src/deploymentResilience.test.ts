import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("static deployment resilience", () => {
  it("uses hash routing so nested routes survive static-host refreshes", () => {
    const source = readSource("./App.tsx");
    expect(source).toContain("HashRouter");
    expect(source).not.toContain("BrowserRouter");
  });

  it("falls back to an embedded map when Mapbox is missing or rejected", () => {
    const source = readSource("./components/maps/VehicleLocationMap.tsx");
    expect(source).toContain("OpenStreetMapFallback");
    expect(source).toContain("!MAPBOX_TOKEN || mapError");
    expect(source).toContain("https://www.openstreetmap.org/export/embed.html");
  });

  it("keeps the location picker editable on the OpenStreetMap fallback", () => {
    const source = readSource("./components/maps/VehicleLocationMap.tsx");
    expect(source).toContain("choosePoint");
    expect(source).toContain("onClick={(event) => choosePoint");
    expect(source).toContain("onChange(west + horizontalRatio");
    expect(source).toContain("editable={editable}");
    expect(source).toContain("onChange={onChange}");
  });
});
