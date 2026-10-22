import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const entry = readFileSync(new URL("./main.tsx", import.meta.url), "utf8");
const map = readFileSync(
  new URL("./components/maps/VehicleLocationMap.tsx", import.meta.url),
  "utf8",
);
const viteConfig = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");

describe("map code splitting", () => {
  it("keeps Mapbox styles out of the application entry point", () => {
    expect(entry).not.toContain("mapbox-gl/dist/mapbox-gl.css");
  });

  it("loads Mapbox GL and its styles with the lazy map implementation", () => {
    expect(map).toContain('import "mapbox-gl/dist/mapbox-gl.css"');
    expect(map).toContain('from "mapbox-gl"');
  });

  it("does not absorb shared dependencies into lazy manual chunks", () => {
    expect(viteConfig).not.toContain('return "maps"');
    expect(viteConfig).toMatch(/mapbox-gl/);
    expect(viteConfig).toContain("return undefined");
  });
});
