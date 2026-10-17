import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  companyLogoUrl,
  photoUrl,
  vehiclePlaceholderImage,
} from "./vehicleMapper";

describe("uploaded media URLs", () => {
  it("proxies every backend media directory during Vite development", () => {
    const viteConfig = readFileSync(
      new URL("../../vite.config.ts", import.meta.url),
      "utf8",
    );

    for (const route of ["vehicles", "companies", "users", "cars"]) {
      expect(viteConfig).toContain(`"/public/${route}"`);
    }
  });

  it("routes generated vehicle images through the backend media mount", () => {
    expect(photoUrl("vehicle-123.jpeg")).toBe(
      "/public/vehicles/vehicle-123.jpeg",
    );
  });

  it("keeps legacy car images on their legacy media directory", () => {
    expect(photoUrl("car-1.jpg")).toBe("/public/cars/car-1.jpg");
  });

  it("normalizes old stored public and direct media paths", () => {
    expect(photoUrl("/vehicles/vehicle one.jpeg")).toBe(
      "/public/vehicles/vehicle%20one.jpeg",
    );
    expect(photoUrl("/public/cars/car-2.jpg")).toBe(
      "/public/cars/car-2.jpg",
    );
    expect(companyLogoUrl("/public/companies/company logo.webp")).toBe(
      "/public/companies/company%20logo.webp",
    );
  });

  it("leaves trusted absolute browser image URLs unchanged", () => {
    expect(photoUrl("https://cdn.example.com/car.jpg")).toBe(
      "https://cdn.example.com/car.jpg",
    );
    expect(companyLogoUrl("blob:https://app.example.com/logo-id")).toBe(
      "blob:https://app.example.com/logo-id",
    );
  });

  it("uses honest fallbacks for absent vehicle and company images", () => {
    expect(photoUrl(undefined)).toBe(vehiclePlaceholderImage);
    expect(companyLogoUrl(undefined)).toBeNull();
    expect(companyLogoUrl("default-company-logo.png")).toBeNull();
  });
});
