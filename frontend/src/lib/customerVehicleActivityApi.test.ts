import { afterEach, describe, expect, it, vi } from "vitest";
import { customerVehicleActivityApi } from "./customerVehicleActivityApi";

afterEach(() => vi.unstubAllGlobals());

describe("customerVehicleActivityApi", () => {
  it("persists explicit favourite state", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "success", data: { vehicleId: "abc", favorite: true } }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await customerVehicleActivityApi.setFavorite("abc", true);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/customer-vehicle-activity/abc/favorite"), expect.objectContaining({ method: "PATCH", body: JSON.stringify({ favorite: true }), credentials: "include" }));
  });

  it("records a detail-page view", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await customerVehicleActivityApi.recordView("abc");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/customer-vehicle-activity/abc/view"), expect.objectContaining({ method: "POST" }));
  });
});
