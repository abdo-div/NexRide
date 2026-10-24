import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("admin design system", () => {
  it("defines shared operations table and panel primitives", () => {
    const css = read("./index.css");
    expect(css).toContain(".admin-panel");
    expect(css).toContain(".admin-table thead th");
    expect(css).toContain(".admin-table tbody td");
  });

  it("uses the shared table treatment across core admin domains", () => {
    const tables = ["AdminBookingsTable", "AdminCompaniesTable", "AdminCustomersTable", "AdminFleetTable", "AdminMaintenanceTable", "AdminPaymentsTable", "AdminPayoutsTable"];
    for (const table of tables) {
      expect(read(`./components/admin/${table}.tsx`)).toContain('className="admin-table"');
    }
  });
});
