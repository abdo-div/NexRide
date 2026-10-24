import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicAsset = (name: string) =>
  readFileSync(new URL(`../public/${name}`, import.meta.url), "utf8");

describe("search discovery assets", () => {
  it("publishes a sitemap containing every indexable static route", () => {
    const sitemap = publicAsset("sitemap.xml");
    const expectedRoutes = [
      "https://nexride.ly/",
      "https://nexride.ly/fleet",
      "https://nexride.ly/companies",
      "https://nexride.ly/partner/apply",
      "https://nexride.ly/terms",
      "https://nexride.ly/privacy",
      "https://nexride.ly/cancellation-policy",
    ];

    for (const route of expectedRoutes) {
      expect(sitemap).toContain(`<loc>${route}</loc>`);
    }
    expect(sitemap).not.toContain("/admin");
    expect(sitemap).not.toContain("/checkout");
  });

  it("guides crawlers away from private and transactional areas", () => {
    const robots = publicAsset("robots.txt");
    for (const route of [
      "/admin/",
      "/company/",
      "/checkout/",
      "/payment/",
      "/booking-confirmed/",
      "/auth",
      "/login",
      "/my-bookings",
      "/my-profile",
      "/reset-password/",
    ]) {
      expect(robots).toContain(`Disallow: ${route}`);
    }
    expect(robots).toContain("Sitemap: https://nexride.ly/sitemap.xml");
  });
});
