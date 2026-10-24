import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import en from "./i18n/locales/en.json";
import ar from "./i18n/locales/ar.json";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("keyboard content navigation", () => {
  it("offers a localized skip link as the first global navigation aid", () => {
    const app = readSource("./App.tsx");
    const skipLink = readSource("./components/layouts/SkipToContent.tsx");

    expect(app).toContain("<SkipToContent />");
    expect(skipLink).toContain('href="#main-content"');
    expect(skipLink).toContain('t("accessibility.skipToContent")');
    expect(ar.accessibility.skipToContent).toBeTruthy();
    expect(en.accessibility.skipToContent).toBeTruthy();
  });

  it("makes every application shell focusable by the skip link", () => {
    const shells = [
      readSource("./App.tsx"),
      readSource("./components/admin/AdminLayout.tsx"),
      readSource("./components/company/CompanyLayout.tsx"),
    ];

    for (const shell of shells) {
      expect(shell).toContain('id="main-content"');
      expect(shell).toContain("tabIndex={-1}");
    }
  });
});
