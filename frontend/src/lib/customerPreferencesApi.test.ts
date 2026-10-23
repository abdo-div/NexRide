import { afterEach, describe, expect, it, vi } from "vitest";
import { customerPreferencesApi } from "./customerPreferencesApi";
import { DEFAULT_CUSTOMER_PREFERENCES } from "../types/customerPreferences";

afterEach(() => vi.unstubAllGlobals());

describe("customerPreferencesApi", () => {
  it("updates the session customer's complete preference profile", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "success", data: { preferences: DEFAULT_CUSTOMER_PREFERENCES } }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await customerPreferencesApi.update(DEFAULT_CUSTOMER_PREFERENCES);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/users/me/preferences"), expect.objectContaining({ method: "PATCH", credentials: "include", body: JSON.stringify(DEFAULT_CUSTOMER_PREFERENCES) }));
  });
});
