import { afterEach, describe, expect, it, vi } from "vitest";
import { rewardApi } from "./rewardApi";

afterEach(() => vi.unstubAllGlobals());

describe("rewardApi", () => {
  it("requests a server-calculated promotion quote", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "success", data: { quote: { code: "DRIVE15" } } }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const payload = { code: "DRIVE15", vehicleId: "vehicle", startDate: "2026-11-01", endDate: "2026-11-03", addonIds: [] };
    await rewardApi.quote(payload);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/rewards/promotion-quote"), expect.objectContaining({ method: "POST", body: JSON.stringify(payload), credentials: "include" }));
  });
});
