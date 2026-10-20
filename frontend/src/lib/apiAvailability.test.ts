import { afterEach, describe, expect, it, vi } from "vitest";
import {
  API_AVAILABLE_EVENT,
  API_UNAVAILABLE_EVENT,
  reportApiAvailable,
  trackedFetch,
} from "./apiAvailability";

afterEach(() => {
  reportApiAvailable();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("API availability tracking", () => {
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
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));

    await expect(trackedFetch("/api/v1/vehicles")).rejects.toThrow("connection reset");
    await trackedFetch("/api/v1/health");
    expect(available).toHaveBeenCalledOnce();
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
