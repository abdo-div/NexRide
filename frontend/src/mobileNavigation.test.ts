import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import en from "./i18n/locales/en.json";
import ar from "./i18n/locales/ar.json";

const source = readFileSync(
  new URL("./components/layouts/NavBar.tsx", import.meta.url),
  "utf8",
);

describe("mobile navigation", () => {
  it("exposes its state and relationship to assistive technology", () => {
    expect(source).toContain('aria-controls="mobile-navigation"');
    expect(source).toContain("aria-expanded={mobileMenuOpen}");
    expect(source).toContain('id="mobile-navigation"');
    expect(source).toContain('t("nav.mobileNavigation")');
  });

  it("supports expected keyboard and focus behavior", () => {
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("firstMobileLinkRef.current?.focus()");
    expect(source).toContain("menuButtonRef.current?.focus()");
    expect(source).toContain('document.body.style.overflow = "hidden"');
  });

  it("respects reduced-motion preferences", () => {
    expect(source).toContain("useReducedMotion()");
    expect(source).toContain("duration: reduceMotion ? 0 : 0.2");
  });

  it("provides matching menu labels in both languages", () => {
    expect(Object.keys(ar.nav).sort()).toEqual(Object.keys(en.nav).sort());
    expect(en.nav.openMenu).toBeTruthy();
    expect(ar.nav.closeMenu).toBeTruthy();
  });
});
