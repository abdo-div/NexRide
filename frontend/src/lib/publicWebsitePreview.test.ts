import { describe, expect, it } from "vitest";
import { publicWebsiteHref } from "./publicWebsitePreview";

describe("publicWebsiteHref", () => {
  it("leaves normal customer navigation unchanged", () => {
    expect(publicWebsiteHref("/fleet", false)).toBe("/fleet");
  });

  it("preserves staff website preview between public pages", () => {
    expect(publicWebsiteHref("/fleet", true)).toBe(
      "/fleet?preview=website",
    );
  });

  it("places the preview query before home-page section hashes", () => {
    expect(publicWebsiteHref("/#locations", true)).toBe(
      "/?preview=website#locations",
    );
  });
});
