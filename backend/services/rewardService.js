import Booking from "../models/booking_model.js";
import Vehicle from "../models/vehicle_model.js";
import AppError from "../utils/appError.js";
import { calculateBookingExtras, MUNICIPAL_FEE_LYD } from "../utils/bookingPricing.js";

const PROMOTIONS = [
  { code: "WELCOME10", percent: 10, maxDiscount: 100, minSubtotal: 200, firstPaidTripOnly: true },
  { code: "DRIVE15", percent: 15, maxDiscount: 200, minSubtotal: 800, firstPaidTripOnly: false },
];

export const publicPromotions = () => PROMOTIONS.map(({ firstPaidTripOnly, ...promotion }) => ({ ...promotion, firstPaidTripOnly }));

export const calculatePromotionDiscount = async ({ code, customerId, subtotal, session }) => {
  if (!code) return { code: null, discountAmount: 0 };
  const normalized = String(code).trim().toUpperCase();
  const promotion = PROMOTIONS.find((entry) => entry.code === normalized);
  if (!promotion) throw new AppError("Promotion code is invalid", 400);
  if (subtotal < promotion.minSubtotal) throw new AppError(`This promotion requires a subtotal of at least ${promotion.minSubtotal} LYD`, 400);
  if (promotion.firstPaidTripOnly) {
    let query = Booking.exists({ customerId, paymentStatus: "PAID" });
    if (session) query = query.session(session);
    if (await query) throw new AppError("This promotion is available only before your first paid trip", 409);
  }
  const discountAmount = Math.min(promotion.maxDiscount, Number(((subtotal * promotion.percent) / 100).toFixed(2)));
  return { code: normalized, discountAmount, promotion };
};

export const quotePromotion = async ({ customerId, vehicleId, startDate, endDate, addonIds, code }) => {
  const vehicle = await Vehicle.findById(vehicleId).select("dailyPrice listingStatus operationalStatus");
  if (!vehicle || vehicle.listingStatus !== "PUBLISHED") throw new AppError("Vehicle is not available for rental", 404);
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end - start) / 86400000);
  if (!Number.isInteger(totalDays) || totalDays < 1) throw new AppError("End date must be after start date", 400);
  const extras = calculateBookingExtras(addonIds ?? [], totalDays);
  const subtotal = totalDays * vehicle.dailyPrice + extras.addonsTotal + MUNICIPAL_FEE_LYD;
  const quote = await calculatePromotionDiscount({ code, customerId, subtotal });
  return { code: quote.code, subtotal, discountAmount: quote.discountAmount, total: subtotal - quote.discountAmount };
};

export const buildRewardsSummary = (summary = {}) => {
  const paidAmount = summary?.paidAmount ?? 0;
  const points = Math.floor(paidAmount / 10);
  const tiers = [
    { name: "EXPLORER", minimum: 0 },
    { name: "SILVER", minimum: 500 },
    { name: "GOLD", minimum: 1500 },
  ];
  const tier = [...tiers].reverse().find((entry) => points >= entry.minimum) ?? tiers[0];
  const nextTier = tiers.find((entry) => entry.minimum > points) ?? null;
  return { points, paidAmount, trips: summary?.trips ?? 0, tier: tier.name, nextTier: nextTier?.name ?? null, pointsToNextTier: nextTier ? nextTier.minimum - points : 0, promotions: publicPromotions() };
};

export const getCustomerRewards = async (customerId) => {
  const [summary] = await Booking.aggregate([
    { $match: { customerId, paymentStatus: "PAID" } },
    { $group: { _id: null, paidAmount: { $sum: "$totalAmount" }, trips: { $sum: 1 } } },
  ]);
  return buildRewardsSummary(summary);
};
