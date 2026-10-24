import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("customer page states", () => {
  it("provides accessible error, empty, and filtered variants", () => {
    const panel = read("./components/feedback/CustomerStatePanel.tsx");
    expect(panel).toContain('"error" | "empty" | "filtered"');
    expect(panel).toContain('role={error ? "alert" : "status"}');
  });

  it("uses the shared states on directories and bookings", () => {
    expect(read("./pages/CompaniesPage.tsx")).toContain("<CustomerStatePanel");
    const bookings = read("./pages/MyBookingsPage.tsx");
    expect(bookings).toContain('variant="filtered"');
    expect(bookings).toContain('actionHref="/fleet"');
  });
});
