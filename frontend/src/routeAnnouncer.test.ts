import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import en from "./i18n/locales/en.json";
import ar from "./i18n/locales/ar.json";

const source = readFileSync(
  new URL("./components/layouts/RouteAnnouncer.tsx", import.meta.url),
  "utf8",
);
const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

describe("route announcements", () => {
  it("mounts one global announcer alongside page metadata", () => {
    expect(appSource).toContain("<PageMetadata />");
    expect(appSource).toContain("<RouteAnnouncer />");
    expect(appSource.indexOf("<RouteAnnouncer />")).toBeGreaterThan(
      appSource.indexOf("<PageMetadata />"),
    );
  });

  it("announces localized route titles through a polite live region", () => {
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('aria-atomic="true"');
    expect(source).toContain("resolvePageMetadata(pathname)");
    expect(source).toContain('t("accessibility.pageChanged"');
  });

  it("provides matching bilingual announcement copy", () => {
    expect(en.accessibility.pageChanged).toContain("{{title}}");
    expect(ar.accessibility.pageChanged).toContain("{{title}}");
  });
});
