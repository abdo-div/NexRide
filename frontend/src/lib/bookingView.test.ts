import { describe, expect, it } from "vitest";
import {
  formatLYD,
  isTerminatedStatus,
  isUpcomingStatus,
  pickupTiming,
  referenceCodeFrom,
  rentalDays,
} from "./bookingView";

describe("booking view helpers", () => {
  it("classifies active and finished booking states", () => {
    expect(isUpcomingStatus("PENDING_PAYMENT")).toBe(true);
    expect(isUpcomingStatus("ACTIVE")).toBe(true);
    expect(isUpcomingStatus("COMPLETED")).toBe(false);
    expect(isTerminatedStatus("CANCELLED")).toBe(true);
    expect(isTerminatedStatus("EXPIRED")).toBe(true);
    expect(isTerminatedStatus("CONFIRMED")).toBe(false);
  });

  it("builds a compact uppercase booking reference", () => {
    expect(referenceCodeFrom("66abc123def456")).toBe("NX-DEF456");
  });

  it("calculates rental duration with a one-day minimum", () => {
    expect(rentalDays("2026-10-12T10:00:00Z", "2026-10-15T10:00:00Z")).toBe(3);
    expect(rentalDays("2026-10-12T10:00:00Z", "2026-10-12T12:00:00Z")).toBe(1);
  });

  it("reports future, same-day, and overdue pickup dates truthfully", () => {
    const now = new Date(2026, 9, 17, 12);

    expect(pickupTiming("2026-10-20T10:00:00", now)).toEqual({
      phase: "future",
      days: 3,
    });
    expect(pickupTiming("2026-10-17T01:00:00", now)).toEqual({
      phase: "today",
      days: 0,
    });
    expect(pickupTiming("2026-10-05T10:00:00", now)).toEqual({
      phase: "overdue",
      days: 12,
    });
  });

  it("formats Libyan dinar values consistently", () => {
    expect(formatLYD(1234.5)).toBe("1,234.50");
  });
});
