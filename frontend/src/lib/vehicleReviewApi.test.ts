import { afterEach, describe, expect, it, vi } from "vitest";
import { vehicleApi } from "./vehicleApi";

afterEach(() => vi.unstubAllGlobals());

describe("verified review API", () => {
  it("binds creation to a booking and supports owned edits and deletion", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "success", data: { review: {} } }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await vehicleApi.createReview("vehicle/1", "booking/1", 5, "Excellent trip");
    await vehicleApi.updateReview("vehicle/1", "review/1", 4, "Still a good trip");
    await vehicleApi.deleteReview("vehicle/1", "review/1");
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method: "POST", body: JSON.stringify({ bookingId: "booking/1", rating: 5, review: "Excellent trip" }) }));
    expect(fetchMock.mock.calls[1][0]).toContain("vehicle%2F1/reviews/review%2F1");
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: "PATCH" }));
    expect(fetchMock.mock.calls[2][1]).toEqual(expect.objectContaining({ method: "DELETE" }));
  });
});
