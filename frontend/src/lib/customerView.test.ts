import { describe, expect, it } from "vitest";

import { userPhotoUrl } from "./customerView";

describe("userPhotoUrl", () => {
  it("routes uploaded profile photos through the backend media mount", () => {
    expect(userPhotoUrl("user-123.jpeg")).toBe(
      "/public/users/user-123.jpeg",
    );
  });

  it("normalizes stored user and legacy avatar paths", () => {
    expect(userPhotoUrl("/users/user one.png")).toBe(
      "/public/users/user%20one.png",
    );
    expect(userPhotoUrl("/public/users/user-123.jpeg")).toBe(
      "/public/users/user-123.jpeg",
    );
    expect(userPhotoUrl("avatars/user-456.webp")).toBe(
      "/public/users/user-456.webp",
    );
  });

  it("keeps browser-ready image URLs unchanged", () => {
    expect(userPhotoUrl("https://cdn.example.com/avatar.jpg")).toBe(
      "https://cdn.example.com/avatar.jpg",
    );
    expect(userPhotoUrl("blob:https://app.example.com/avatar-id")).toBe(
      "blob:https://app.example.com/avatar-id",
    );
  });

  it("uses initials for absent and default photos", () => {
    expect(userPhotoUrl(undefined)).toBe("");
    expect(userPhotoUrl("default.jpg")).toBe("");
  });
});
