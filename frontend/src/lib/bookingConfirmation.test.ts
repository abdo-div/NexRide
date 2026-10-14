import { describe, it, expect } from "vitest";
import { buildConfirmation } from "./bookingConfirmation";
import type { BookingDto } from "../types/booking";
import type { Vehicle } from "../types/vehicle";
const booking = {
 _id: "a".repeat(24), customerId: { _id: "b", name: "Account Owner", email: "owner@example.com" }, companyId: { _id: "c", name: "Operator" },
 primaryDriver: { firstName: "QA", lastName: "Driver", email: "driver@example.com", phone: "+218910000001", eligibilityConfirmed: true },
 startDate: "2026-11-27T12:00:00Z", endDate: "2026-11-28T12:00:00Z", pickupLocation: "Depot", rentalPrice: 100, dailyRate: 100, totalDays: 1, municipalFee: 25, discountAmount: 0,
 addons: [{ id: "childseat", amount: 20, unit: "FLAT", unitPrice: 20, quantity: 1 }], totalAmount: 145, paymentStatus: "UNPAID", bookingStatus: "PENDING_PAYMENT",
} as BookingDto;
const vehicle = { title: "Test vehicle", specs: { fuel: "Gasoline" }, operator: { name: "Operator" }, perks: [], category: "Sedan" } as unknown as Vehicle;
describe("booking confirmation reflects persisted facts", () => {
 it("itemizes extras and fee, uses driver identity and preserves 2 PM Tripoli time", () => {
   const result = buildConfirmation(booking, vehicle, true, "en");
   expect(result.meta.identification.driverName).toBe("QA Driver");
   expect(result.meta.identification.email).toBe("driver@example.com");
   expect(result.meta.route.pickup.datetime).toContain("2:00 PM");
   expect(result.fareLines.map(line => line.amount)).toEqual(["100.00 LYD", "20.00 LYD", "25.00 LYD"]);
   expect(result.total).toBe("145.00 LYD");
 });
 it("never claims payment or escrow for an unpaid booking", () => {
   const result = buildConfirmation(booking, vehicle, true, "en");
   expect(result.meta.success.title).toBe("booking.success.pendingTitle");
   expect(result.meta.reference.chips).toEqual([]);
   expect(result.meta.route.pickup.note).toBeUndefined();
 });
 it("changes payment heading only with persisted paid status", () => {
   expect(buildConfirmation({ ...booking, paymentStatus: "PAID" }, vehicle, false, "en").meta.success.title).toBe("booking.success.title");
 });
});
