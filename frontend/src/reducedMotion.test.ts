import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("reduced motion support", () => {
  it("applies the user preference to every Framer Motion component", () => {
    const app = readSource("./App.tsx");
    expect(app).toContain('import { MotionConfig } from "framer-motion"');
    expect(app).toContain('<MotionConfig reducedMotion="user">');
  });

  it("disables smooth scrolling when reduced motion is requested", () => {
    const smoothScroll = readSource("./components/SmoothScroll.tsx");
    expect(smoothScroll).toContain('(prefers-reduced-motion: reduce)');
    expect(smoothScroll).toContain("return;");
  });

  it("minimizes CSS animation and transition durations globally", () => {
    const css = readSource("./index.css");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-duration: 0.01ms !important");
    expect(css).toContain("transition-duration: 0.01ms !important");
  });
});
