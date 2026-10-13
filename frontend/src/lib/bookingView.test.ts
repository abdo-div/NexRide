import { describe, expect, it } from "vitest";
import {
  formatLYD,
  isTerminatedStatus,
  isUpcomingStatus,
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

  it("formats Libyan dinar values consistently", () => {
    expect(formatLYD(1234.5)).toBe("1,234.50");
  });
});
