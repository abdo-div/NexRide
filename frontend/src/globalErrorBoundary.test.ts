import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import en from "./i18n/locales/en.json";
import ar from "./i18n/locales/ar.json";

const source = readFileSync(
  new URL("./components/layouts/GlobalErrorBoundary.tsx", import.meta.url),
  "utf8",
);

describe("global error recovery", () => {
  it("provides accessible recovery actions", () => {
    expect(source).toContain('role="alert"');
    expect(source).toContain("window.location.reload()");
    expect(source).toContain('window.location.assign("/")');
  });

  it("resets a captured error when navigation changes", () => {
    expect(source).toContain("previousProps.resetKey !== this.props.resetKey");
    expect(source).toContain("this.setState({ hasError: false })");
  });

  it("keeps recovery copy complete in both languages", () => {
    expect(Object.keys(ar.globalError)).toEqual(Object.keys(en.globalError));
    expect(en.globalError.retry).toBeTruthy();
    expect(ar.globalError.retry).toBeTruthy();
  });
});
