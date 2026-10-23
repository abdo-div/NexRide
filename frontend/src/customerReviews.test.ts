import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("completed-trip review workflow", () => {
  it("shows review management on booking details", () => {
    expect(source("./pages/BookingDetailsPage.tsx")).toContain("<BookingReviewCard");
    const card = source("./components/bookingDetails/BookingReviewCard.tsx");
    expect(card).toContain("booking.bookingStatus !== \"COMPLETED\"");
    expect(card).toContain("vehicleApi.createReview(vehicleId, booking._id");
    expect(card).toContain("vehicleApi.updateReview");
    expect(card).toContain("vehicleApi.deleteReview");
    expect(card).toContain("confirmDialog");
  });
});
