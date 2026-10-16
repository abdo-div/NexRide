import { describe, expect, it } from "vitest";

import { getLegalDocument, legalDocuments } from "./legalContent";

describe("legal content", () => {
  it("publishes complete English and Arabic versions of every policy", () => {
    for (const document of Object.values(legalDocuments)) {
      for (const language of ["en", "ar"] as const) {
        const localized = document[language];
        expect(localized.title.length).toBeGreaterThan(3);
        expect(localized.summary.length).toBeGreaterThan(20);
        expect(localized.sections.length).toBeGreaterThanOrEqual(6);
        expect(JSON.stringify(localized)).not.toMatch(/TODO|TBD|example\.com/i);
      }
    }
  });

  it("documents the same cancellation fractions enforced by the backend", () => {
    const policy = getLegalDocument("cancellation", "en");
    const text = JSON.stringify(policy);

    expect(text).toContain("100%");
    expect(text).toContain("50%");
    expect(text).toContain("no refund");
  });

  it("falls back to English for non-Arabic locales", () => {
    expect(getLegalDocument("privacy", "fr")).toBe(
      legalDocuments.privacy.en,
    );
  });
});
