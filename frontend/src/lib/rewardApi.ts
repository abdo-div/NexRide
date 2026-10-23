import { request } from "./apiClient";
import type { PromotionQuote, RewardsSummary } from "../types/rewards";

export const rewardApi = {
  mine: (signal?: AbortSignal) => request<{ status: string; data: { rewards: RewardsSummary } }>("/rewards/me", { signal }),
  quote: (payload: { code: string; vehicleId: string; startDate: string; endDate: string; addonIds: string[] }) =>
    request<{ status: string; data: { quote: PromotionQuote } }>("/rewards/promotion-quote", { method: "POST", body: payload }),
};
