import { afterEach, describe, expect, it, vi } from "vitest";
import {
  forgetMpgsAttempt,
  openMpgsCheckout,
  readMpgsAttempt,
  rememberMpgsAttempt,
} from "./mpgsCheckout";

describe("MPGS Hosted Checkout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("configures Mastercard only with the server-created session ID", async () => {
    const checkout = {
      configure: vi.fn(),
      showPaymentPage: vi.fn(),
    };
    vi.stubGlobal("window", { Checkout: checkout });

    await openMpgsCheckout("SESSION-123");

    expect(checkout.configure).toHaveBeenCalledWith({
      session: { id: "SESSION-123" },
    });
    expect(checkout.showPaymentPage).toHaveBeenCalledOnce();
  });

  it("refuses an empty MPGS session", async () => {
    vi.stubGlobal("window", {});
    await expect(openMpgsCheckout("   ")).rejects.toThrow(
      "MPGS session ID is required",
    );
  });

  it("stores only non-sensitive return-navigation identifiers", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      setItem: (key: string, value: string) => values.set(key, value),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    });
    const attempt = {
      orderId: "ORDER-1",
      bookingId: "BOOKING-1",
      vehicleId: "VEHICLE-1",
    };

    rememberMpgsAttempt(attempt);
    expect(readMpgsAttempt()).toEqual(attempt);
    expect([...values.values()].join(" ")).not.toMatch(/password|card|cvv/i);

    forgetMpgsAttempt();
    expect(readMpgsAttempt()).toBeNull();
  });

  it("rejects malformed remembered attempts", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => JSON.stringify({ orderId: "ORDER-1" }),
      removeItem: vi.fn(),
    });
    expect(readMpgsAttempt()).toBeNull();
  });
});
