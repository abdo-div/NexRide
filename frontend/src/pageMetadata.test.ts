import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import en from "./i18n/locales/en.json";
import ar from "./i18n/locales/ar.json";
import { resolvePageMetadata } from "./utils/pageMetadata";

describe("page metadata", () => {
  it("maps public discovery pages to indexable metadata", () => {
    expect(resolvePageMetadata("/")).toEqual({ key: "home", indexable: true });
    expect(resolvePageMetadata("/fleet")).toEqual({ key: "fleet", indexable: true });
    expect(resolvePageMetadata("/companies/company-1")).toEqual({ key: "company", indexable: true });
    expect(resolvePageMetadata("/vehicles/car-1")).toEqual({ key: "vehicle", indexable: true });
  });

  it("keeps private and transactional routes out of search indexes", () => {
    expect(resolvePageMetadata("/checkout/car-1").indexable).toBe(false);
    expect(resolvePageMetadata("/my-bookings").indexable).toBe(false);
    expect(resolvePageMetadata("/admin/reports").indexable).toBe(false);
    expect(resolvePageMetadata("/company/settings").indexable).toBe(false);
  });

  it("provides matching metadata in both languages", () => {
    expect(Object.keys(ar.seo)).toEqual(Object.keys(en.seo));
    for (const entry of Object.values(en.seo)) {
      expect(entry.title).toBeTruthy();
      expect(entry.description).toBeTruthy();
    }
  });

  it("ships useful metadata before JavaScript loads", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    expect(html).not.toContain("<title>frontend</title>");
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('name="description"');
  });
});
