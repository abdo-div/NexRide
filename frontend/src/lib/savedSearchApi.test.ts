import { afterEach, describe, expect, it, vi } from "vitest";
import { savedSearchApi } from "./savedSearchApi";

afterEach(() => vi.unstubAllGlobals());

describe("savedSearchApi", () => {
  it("creates, updates, and deletes customer-owned searches", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "success", data: { search: {} } }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const criteria = { location: "Tripoli", type: ["SUV" as const], transmission: "AUTOMATIC" as const, fuelType: "" as const, maxPrice: 300, startDate: null, endDate: null };
    await savedSearchApi.create({ name: "Tripoli SUVs", criteria, alertsEnabled: true });
    await savedSearchApi.update("search/1", { alertsEnabled: false });
    await savedSearchApi.remove("search/1");
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining("/saved-searches"), expect.objectContaining({ method: "POST", credentials: "include" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining("/saved-searches/search%2F1"), expect.objectContaining({ method: "PATCH" }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, expect.stringContaining("/saved-searches/search%2F1"), expect.objectContaining({ method: "DELETE" }));
  });
});
