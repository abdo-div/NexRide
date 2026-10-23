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

describe("bookingApi.cancellationQuote", () => {
  it("loads the authoritative quote before the customer confirms", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          data: { quote: { bookingId: "booking id", refundableAmount: 100 } },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await bookingApi.cancellationQuote("booking id");

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/bookings/booking%20id/cancellation-quote");
    expect(options).toMatchObject({ credentials: "include" });
  });
});

describe("bookingApi.create", () => {
  it("forwards a caller-stable idempotency key for safe checkout retries", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          data: { booking: { _id: "booking-id" } },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await bookingApi.create(
      {
        vehicleId: "vehicle-id",
        startDate: "2026-11-01T10:00:00.000Z",
        endDate: "2026-11-04T10:00:00.000Z",
      },
      "550e8400-e29b-41d4-a716-446655440000",
    );

    const [, options] = fetchMock.mock.calls[0];
    expect(options?.headers).toMatchObject({
      "Idempotency-Key": "550e8400-e29b-41d4-a716-446655440000",
    });
  });
});

describe("bookingApi.modify", () => {
  it("sends only itinerary fields to the customer modification endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ status: "success", data: { booking: { _id: "booking-id" } } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const payload = {
      startDate: "2027-01-10T10:00:00.000Z",
      endDate: "2027-01-13T10:00:00.000Z",
      pickupLocation: "Tripoli Airport",
      pickupMethod: "DELIVERY" as const,
      addonIds: ["insurance" as const],
    };

    await bookingApi.modify("booking-id", payload);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/bookings/booking-id/modify");
    expect(options).toMatchObject({ method: "PATCH", body: JSON.stringify(payload) });
  });
});

describe("bookingApi.saveHandover", () => {
  it("stores the customer return declaration on its booking", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ status: "success", data: { booking: { _id: "booking-id" } } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const payload = {
      stage: "RETURN" as const,
      personalItemsRemoved: true as const,
      fuelRestored: true,
      damageReported: false,
      fuelLevel: "FULL" as const,
      odometer: 45000,
    };

    await bookingApi.saveHandover("booking-id", payload);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/bookings/booking-id/handover/return");
    expect(options).toMatchObject({ method: "PATCH", body: JSON.stringify(payload) });
  });
});
