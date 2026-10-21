import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("company responsive workspace", () => {
  it("provides a persistent mobile operations navigation", () => {
    const layout = read("./components/company/CompanyLayout.tsx");
    expect(layout).toContain('aria-label={t("company.layout.mobileNavigation")}');
    expect(layout).toContain("lg:hidden");
    expect(layout).toContain("pb-28");
  });

  it("uses responsive fleet actions and filter controls", () => {
    expect(read("./components/company/CompanyFleetHeader.tsx")).toContain("grid-cols-1");
    expect(read("./components/company/CompanyFleetToolbar.tsx")).toContain("grid-cols-2");
  });
});
