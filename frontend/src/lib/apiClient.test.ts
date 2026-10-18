import { afterEach, describe, expect, it, vi } from "vitest";

import { request, resolveApiBaseUrl } from "./apiClient";

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe("request authentication", () => {
  it("uses the HTTP-only cookie without exposing an authorization header", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await request("/users/me");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0];
    expect(options?.credentials).toBe("include");
    expect(options?.headers).not.toHaveProperty("Authorization");
  });
});
