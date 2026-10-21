import { afterEach, describe, expect, it, vi } from "vitest";
import {
  API_AVAILABLE_EVENT,
  API_REQUEST_TIMEOUT_MS,
  API_UNAVAILABLE_EVENT,
  ApiTimeoutError,
  canRetryRequest,
  reportApiAvailable,
  trackedFetch,
} from "./apiAvailability";

afterEach(() => {
  reportApiAvailable();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("API availability tracking", () => {
  it("only retries safe, idempotent request methods", () => {
    expect(canRetryRequest()).toBe(true);
    expect(canRetryRequest("GET")).toBe(true);
    expect(canRetryRequest("HEAD")).toBe(true);
    expect(canRetryRequest("POST")).toBe(false);
    expect(canRetryRequest("PATCH")).toBe(false);
    expect(canRetryRequest("DELETE")).toBe(false);
  });

  it("announces a transport failure only once until recovery", async () => {
    const browserWindow = new EventTarget();
    const unavailable = vi.fn();
    browserWindow.addEventListener(API_UNAVAILABLE_EVENT, unavailable);
    vi.stubGlobal("window", browserWindow);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    await expect(trackedFetch("/api/v1/vehicles")).rejects.toThrow("fetch failed");
    await expect(trackedFetch("/api/v1/companies")).rejects.toThrow("fetch failed");
    expect(unavailable).toHaveBeenCalledOnce();
  });

  it("announces recovery after the next server response", async () => {
    const browserWindow = new EventTarget();
    const available = vi.fn();
    browserWindow.addEventListener(API_AVAILABLE_EVENT, available);
    vi.stubGlobal("window", browserWindow);
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockRejectedValueOnce(new TypeError("connection reset"));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(
      trackedFetch("/api/v1/bookings", { method: "POST" }),
    ).rejects.toThrow("connection reset");
    await trackedFetch("/api/v1/health");
    expect(available).toHaveBeenCalledOnce();
  });

  it("recovers a safe GET after one transient network failure", async () => {
    vi.stubGlobal("window", new EventTarget());
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockRejectedValueOnce(new TypeError("connection reset"));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const response = await trackedFetch("/api/v1/vehicles");
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a transient gateway response once", async () => {
    vi.stubGlobal("window", new EventTarget());
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const response = await trackedFetch("/api/v1/companies");
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never retries a mutation after a transport failure", async () => {
    vi.stubGlobal("window", new EventTarget());
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new TypeError("connection reset"));

    await expect(
      trackedFetch("/api/v1/bookings", { method: "POST" }),
    ).rejects.toThrow("connection reset");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("times out a hanging mutation without replaying it", async () => {
    vi.useFakeTimers();
    const browserWindow = new EventTarget();
    const unavailable = vi.fn();
    browserWindow.addEventListener(API_UNAVAILABLE_EVENT, unavailable);
    vi.stubGlobal("window", browserWindow);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        }),
    );

    const pending = trackedFetch("/api/v1/bookings", { method: "POST" });
    const rejection = expect(pending).rejects.toBeInstanceOf(ApiTimeoutError);
    await vi.advanceTimersByTimeAsync(API_REQUEST_TIMEOUT_MS);
    await rejection;

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(unavailable).toHaveBeenCalledOnce();
  });

  it("does not report an intentionally aborted request as an outage", async () => {
    const browserWindow = new EventTarget();
    const unavailable = vi.fn();
    browserWindow.addEventListener(API_UNAVAILABLE_EVENT, unavailable);
    vi.stubGlobal("window", browserWindow);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("Aborted", "AbortError"));

    await expect(trackedFetch("/api/v1/vehicles")).rejects.toMatchObject({ name: "AbortError" });
    expect(unavailable).not.toHaveBeenCalled();
  });
});
