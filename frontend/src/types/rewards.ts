export interface Promotion {
  code: string;
  percent: number;
  maxDiscount: number;
  minSubtotal: number;
  firstPaidTripOnly: boolean;
}

export interface RewardsSummary {
  points: number;
  paidAmount: number;
  trips: number;
  tier: "EXPLORER" | "SILVER" | "GOLD";
  nextTier: "SILVER" | "GOLD" | null;
  pointsToNextTier: number;
  promotions: Promotion[];
}

export interface PromotionQuote {
  code: string;
  subtotal: number;
  discountAmount: number;
  total: number;
}
