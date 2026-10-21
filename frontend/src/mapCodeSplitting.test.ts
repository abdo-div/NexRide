import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const entry = readFileSync(new URL("./main.tsx", import.meta.url), "utf8");
const map = readFileSync(
  new URL("./components/maps/VehicleLocationMap.tsx", import.meta.url),
  "utf8",
);
const viteConfig = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");

describe("map code splitting", () => {
  it("keeps Leaflet styles out of the application entry point", () => {
    expect(entry).not.toContain("leaflet/dist/leaflet.css");
  });

  it("loads Leaflet styles with the lazy map implementation", () => {
    expect(map).toContain('import "leaflet/dist/leaflet.css"');
    expect(map).toContain('from "react-leaflet"');
  });

  it("does not absorb shared dependencies into lazy manual chunks", () => {
    expect(viteConfig).not.toContain('return "maps"');
    expect(viteConfig).toMatch(/leaflet\\\//);
    expect(viteConfig).toContain("return undefined");
  });
});
