import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("global toast system", () => {
  it("wraps the application in the shared toast provider", () => {
    const app = read("./App.tsx");
    expect(app).toContain("<ToastProvider>");
    expect(app).toContain("</ToastProvider>");
  });

  it("announces notifications and supports four feedback tones", () => {
    const provider = read("./context/ToastProvider.tsx");
    expect(provider).toContain('aria-live="polite"');
    expect(provider).toContain('role={toast.tone === "error" ? "alert" : "status"}');
    for (const tone of ["success", "error", "warning", "info"]) {
      expect(provider).toContain(`${tone}:`);
    }
  });
});
