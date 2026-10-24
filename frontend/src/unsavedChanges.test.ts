import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("unsaved form protection", () => {
  it("guards add and edit vehicle forms with beforeunload protection", () => {
    const hook = readFileSync(new URL("./hooks/useUnsavedChanges.ts", import.meta.url), "utf8");
    const add = readFileSync(new URL("./pages/company/CompanyVehicleAddPage.tsx", import.meta.url), "utf8");
    const edit = readFileSync(new URL("./pages/company/CompanyVehicleEditPage.tsx", import.meta.url), "utf8");
    expect(hook).toContain('window.addEventListener("beforeunload"');
    expect(add).toContain("useUnsavedChanges(form.dirty");
    expect(edit).toContain("useUnsavedChanges(form.dirty");
  });
});
