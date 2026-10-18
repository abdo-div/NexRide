import { afterEach, describe, expect, it, vi } from "vitest";

import { bookingApi } from "./bookingApi";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("bookingApi.cancel", () => {
  it("sends the empty JSON object accepted by the optional-reason contract", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          data: { booking: { _id: "booking-id" } },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await bookingApi.cancel("booking-id");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/bookings/booking-id/cancel");
    expect(options).toMatchObject({
      method: "PATCH",
      body: "{}",
      credentials: "include",
    });
    expect(options?.headers).toMatchObject({
      "Content-Type": "application/json",
    });
  });
});
