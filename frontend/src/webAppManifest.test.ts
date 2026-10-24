import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifestUrl = new URL("../public/manifest.webmanifest", import.meta.url);
const manifest = JSON.parse(readFileSync(manifestUrl, "utf8")) as {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  theme_color: string;
  icons: Array<{ src: string; sizes: string; purpose: string }>;
  shortcuts: Array<{ url: string }>;
};

describe("mobile web app metadata", () => {
  it("defines a scoped standalone NexRide experience", () => {
    expect(manifest.name).toBe("NexRide Libya");
    expect(manifest.short_name).toBe("NexRide");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#071426");
  });

  it("ships a scalable maskable brand icon and useful shortcuts", () => {
    expect(manifest.icons).toContainEqual(
      expect.objectContaining({
        src: "/nexride-app-icon.svg",
        sizes: "any",
        purpose: "any maskable",
      }),
    );
    expect(existsSync(new URL("../public/nexride-app-icon.svg", import.meta.url))).toBe(true);
    expect(manifest.shortcuts.map(({ url }) => url)).toEqual(["/fleet", "/companies"]);
  });

  it("links the manifest and mobile presentation metadata before JavaScript", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('name="application-name" content="NexRide"');
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
  });
});
