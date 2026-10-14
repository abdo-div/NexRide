import { describe, it, expect, vi } from "vitest";
import { createCheckoutAttempt, normalizeDriver, validDriver } from "./checkoutAttempt";
import type { CreateBookingPayload } from "./bookingApi";
const driver = { firstName: "QA", lastName: "Driver", email: "qa@example.com", phone: "0910000001", eligibilityConfirmed: true };
const payload: CreateBookingPayload = { vehicleId: "a".repeat(24), startDate: "2026-11-27T12:00:00Z", endDate: "2026-11-28T12:00:00Z", primaryDriver: normalizeDriver(driver) };
describe("checkout recovery and driver validation", () => {
  it("gateway retry and simultaneous clicks reuse a single created reservation", async () => {
    const create = vi.fn().mockResolvedValue({ id: "booking-1" });
    const attempt = createCheckoutAttempt(create);
    const results = await Promise.all([attempt(payload), attempt(payload)]);
    expect(results[0]).toEqual(results[1]);
    await attempt(payload);
    expect(create).toHaveBeenCalledTimes(1);
  });
  it("retries an uncertain booking POST with the original payload and idempotency key", async () => {
    const create = vi.fn().mockRejectedValueOnce(new Error("network interrupted")).mockResolvedValue({ id: "booking-1" });
    const attempt = createCheckoutAttempt(create);
    await expect(attempt(payload)).rejects.toThrow("network interrupted");
    await attempt({ ...payload, addonIds: ["driver"] });
    expect(create.mock.calls[0][1]).toBe(create.mock.calls[1][1]);
    expect(create.mock.calls[1][0]).toEqual(payload);
  });
  it("rejects missing contact information, bad numbers and unchecked eligibility", () => {
    expect(validDriver(driver)).toBe(true);
    expect(normalizeDriver(driver).phone).toBe("+218910000001");
    for (const patch of [{ firstName: " " }, { lastName: "" }, { email: "bad" }, { phone: "123" }, { eligibilityConfirmed: false }]) {
      expect(validDriver({ ...driver, ...patch })).toBe(false);
    }
  });
});
