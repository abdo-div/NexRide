import { describe, expect, it } from "vitest";
import { formatReservationDate, reservationInstant, reservationSchedule } from "./reservationSchedule";

describe("reservation time round trip", () => {
  it("preserves PM and midnight/noon in Libya regardless of host timezone", () => {
    expect(reservationInstant("2026-11-27", "02:00 PM")).toBe("2026-11-27T12:00:00.000Z");
    expect(reservationInstant("2026-11-27", "12:00 AM")).toBe("2026-11-26T22:00:00.000Z");
    expect(reservationInstant("2026-11-27", "12:00 PM")).toBe("2026-11-27T10:00:00.000Z");
    expect(reservationInstant("2026-11-27", "14:00")).toBe(reservationInstant("2026-11-27", "02:00 PM"));
  });
  it("prices extra rental hours as an additional day", () => {
    expect(reservationSchedule("2026-11-27", "2026-11-28", "10:00", "14:00").days).toBe(2);
  });
  it("rejects reverse times, impossible dates and malformed input", () => {
    expect(() => reservationSchedule("2026-11-27", "2026-11-27", "14:00", "10:00")).toThrow();
    for (const [date, time] of [["2026-02-30", "10:00"], ["invalid", "10:00"], ["2026-11-27", "25:00"], ["2026-11-27", "00:00 PM"]]) {
      expect(() => reservationInstant(date, time)).toThrow();
    }
  });
  it("formats persisted full ISO timestamps without the payment-page crash", () => {
    expect(formatReservationDate("2026-11-27T12:00:00.000Z", "en")).toContain("2026");
    expect(formatReservationDate("bad", "en")).toBe("—");
  });
});
