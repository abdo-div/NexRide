import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import en from "./i18n/locales/en.json";
import ar from "./i18n/locales/ar.json";

const source = readFileSync(
  new URL("./components/layouts/BackToTop.tsx", import.meta.url),
  "utf8",
);

describe("back to top control", () => {
  it("appears only after meaningful scrolling and uses a passive listener", () => {
    expect(source).toContain("window.scrollY > VISIBILITY_THRESHOLD");
    expect(source).toContain('{ passive: true }');
    expect(source).toContain("if (!visible) return null");
  });

  it("respects reduced-motion preferences", () => {
    expect(source).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(source).toContain('reduceMotion ? "auto" : "smooth"');
  });

  it("has complete bilingual accessible labeling", () => {
    expect(source).toContain('aria-label={t("accessibility.backToTop")}');
    expect(en.accessibility.backToTop).toBeTruthy();
    expect(ar.accessibility.backToTop).toBeTruthy();
  });
});
