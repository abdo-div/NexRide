import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import en from "./i18n/locales/en.json";
import ar from "./i18n/locales/ar.json";
import { resolvePageMetadata } from "./utils/pageMetadata";

const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("./pages/NotFoundPage.tsx", import.meta.url), "utf8");

describe("not found experience", () => {
  it("renders a real fallback route instead of silently redirecting", () => {
    expect(appSource).toContain('path="*" element={<LazyRoute><NotFoundPage /></LazyRoute>}');
    expect(appSource).not.toContain('<Navigate to="/" replace />');
  });

  it("provides accessible recovery links", () => {
    expect(pageSource).toContain('aria-labelledby="not-found-title"');
    expect(pageSource).toContain('to="/fleet"');
    expect(pageSource).toContain('to="/"');
  });

  it("marks unknown routes as non-indexable", () => {
    expect(resolvePageMetadata("/a-page-that-does-not-exist")).toEqual({
      key: "notFound",
      indexable: false,
    });
  });

  it("keeps the recovery copy complete in both languages", () => {
    expect(Object.keys(ar.notFound)).toEqual(Object.keys(en.notFound));
    expect(ar.seo.notFound.title).toBeTruthy();
    expect(en.seo.notFound.title).toBeTruthy();
  });
});
