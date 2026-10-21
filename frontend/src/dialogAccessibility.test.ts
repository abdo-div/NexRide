import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./context/DialogContext.tsx", import.meta.url),
  "utf8",
);

describe("shared dialog accessibility", () => {
  it("exposes modal naming and prompt labeling", () => {
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('aria-labelledby="app-dialog-title"');
    expect(source).toContain('aria-describedby={parts.description ? "app-dialog-description" : undefined}');
    expect(source).toContain('aria-label={dialog.placeholder ?? t("dialogs.reasonPlaceholder")}');
  });

  it("keeps keyboard focus inside the open dialog", () => {
    expect(source).toContain('event.key !== "Tab"');
    expect(source).toContain("modal.querySelectorAll<HTMLElement>");
    expect(source).toContain("document.activeElement === last");
    expect(source).toContain("last.focus()");
    expect(source).toContain("first.focus()");
  });

  it("supports Escape and restores the triggering control", () => {
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("previouslyFocused?.focus()");
    expect(source).toContain('document.body.style.overflow = "hidden"');
  });
});
