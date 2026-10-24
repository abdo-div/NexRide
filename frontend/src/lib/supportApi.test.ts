import { afterEach, describe, expect, it, vi } from "vitest";
import { supportApi } from "./supportApi";

afterEach(() => vi.restoreAllMocks());

describe("supportApi", () => {
  it("creates a support request with its booking context", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "success", data: { ticket: {} } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const payload = {
      bookingId: "booking-id",
      category: "PAYMENT" as const,
      subject: "Payment issue",
      message: "The payment needs checking",
    };

    await supportApi.create(payload);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/support-tickets");
    expect(options).toMatchObject({ method: "POST", body: JSON.stringify(payload) });
  });

  it("loads and replies to the persistent booking thread", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "success", data: { tickets: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await supportApi.listForBooking("booking id");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/support-tickets/booking/booking%20id");
  });
});
