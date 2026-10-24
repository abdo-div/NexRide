import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(new URL("./index.css", import.meta.url), "utf8");

describe("shared design system", () => {
  it("defines reusable brand, surface, and typography primitives", () => {
    for (const token of [
      "--brand-950",
      "--brand-600",
      "--surface",
      "--border-subtle",
      "--text-strong",
      ".premium-surface",
      ".premium-field",
      ".section-kicker",
      ".section-title",
      ".skeleton-shimmer",
      "@keyframes skeleton-sweep",
    ]) {
      expect(stylesheet).toContain(token);
    }
  });

  it("does not globally overwrite semantic icon colors", () => {
    expect(stylesheet).not.toMatch(/svg\[class\*=["']text-(?:amber|emerald|orange|violet)-/);
  });
});
