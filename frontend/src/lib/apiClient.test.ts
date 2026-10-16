import { describe, expect, it } from "vitest";

import { resolveApiBaseUrl } from "./apiClient";

describe("resolveApiBaseUrl", () => {
  it("uses the same-origin API path when no URL is configured", () => {
    expect(resolveApiBaseUrl()).toBe("/api/v1");
    expect(resolveApiBaseUrl("   ")).toBe("/api/v1");
  });

  it("normalizes an explicitly configured API URL", () => {
    expect(resolveApiBaseUrl(" https://api.example.com/api/v1/// ")).toBe(
      "https://api.example.com/api/v1",
    );
  });

  it("supports a relative override", () => {
    expect(resolveApiBaseUrl("/nexride/api/v1/")).toBe("/nexride/api/v1");
  });
});
