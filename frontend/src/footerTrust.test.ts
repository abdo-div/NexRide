import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import en from "./i18n/locales/en.json";
import ar from "./i18n/locales/ar.json";

const source = readFileSync(
  new URL("./components/layouts/Footer.tsx", import.meta.url),
  "utf8",
);

describe("footer trust and contact actions", () => {
  it("uses one consistent phone number for WhatsApp and direct calls", () => {
    expect(source).toContain('const CONTACT_NUMBER = "+218910008820"');
    expect(source).toContain("https://wa.me/${CONTACT_NUMBER.replace");
    expect(source).toContain("href={`tel:${CONTACT_NUMBER}`}");
    expect(source).not.toContain("+218 (0) 21 000 8899");
  });

  it("announces share results and labels the newsletter field", () => {
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('htmlFor="footer-newsletter-email"');
    expect(source).toContain('id="footer-newsletter-email"');
  });

  it("provides matching localized trust copy", () => {
    expect(Object.keys(ar.footer.shareStatus)).toEqual(Object.keys(en.footer.shareStatus));
    expect(en.footer.callSupport).toBeTruthy();
    expect(ar.footer.subscribeEmailLabel).toBeTruthy();
  });
});
