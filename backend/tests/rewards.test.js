import assert from "node:assert/strict";
import { test } from "node:test";
import rewardRouter from "../routes/rewardRoutes.js";
import { protect } from "../middlewares/authMiddleware.js";
import { createBookingSchema } from "../validations/booking.validation.js";
import { promotionQuoteSchema } from "../validations/reward.validation.js";
import { buildRewardsSummary, calculatePromotionDiscount } from "../services/rewardService.js";

test("reward endpoints are authenticated and customer-only", async () => {
  assert.equal(rewardRouter.stack[0].handle, protect);
  const roleError = await new Promise((resolve) => rewardRouter.stack[1].handle({ user: { role: "company" } }, {}, resolve));
  assert.equal(roleError.statusCode, 403);
  assert.ok(rewardRouter.stack.some((layer) => layer.route?.path === "/me" && layer.route.methods.get));
  assert.ok(rewardRouter.stack.some((layer) => layer.route?.path === "/promotion-quote" && layer.route.methods.post));
});

test("checkout accepts a promotion code but rejects client-controlled discounts", () => {
  const body = { vehicleId: "507f1f77bcf86cd799439011", startDate: "2026-11-01", endDate: "2026-11-03", promotionCode: "DRIVE15" };
  assert.equal(createBookingSchema.safeParse({ body }).success, true);
  assert.equal(createBookingSchema.safeParse({ body: { ...body, discountAmount: 9999 } }).success, false);
  assert.equal(promotionQuoteSchema.safeParse({ body: { code: body.promotionCode, vehicleId: body.vehicleId, startDate: body.startDate, endDate: body.endDate, addonIds: [] } }).success, true);
});

test("server promotion policy enforces thresholds and caps", async () => {
  const quote = await calculatePromotionDiscount({ code: "drive15", customerId: "customer", subtotal: 2000 });
  assert.equal(quote.code, "DRIVE15");
  assert.equal(quote.discountAmount, 200);
  await assert.rejects(() => calculatePromotionDiscount({ code: "DRIVE15", customerId: "customer", subtotal: 200 }), /at least 800/);
  await assert.rejects(() => calculatePromotionDiscount({ code: "FORGED99", customerId: "customer", subtotal: 2000 }), /invalid/);
});

test("loyalty tiers derive only from authoritative paid value", () => {
  const summary = buildRewardsSummary({ paidAmount: 6200, trips: 4 });
  assert.equal(summary.points, 620);
  assert.equal(summary.tier, "SILVER");
  assert.equal(summary.nextTier, "GOLD");
  assert.equal(summary.pointsToNextTier, 880);
  assert.equal(buildRewardsSummary({ paidAmount: 16000, trips: 8 }).tier, "GOLD");
});
