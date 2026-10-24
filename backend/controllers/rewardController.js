import catchAsync from "../utils/catchAsync.js";
import { getCustomerRewards, quotePromotion } from "../services/rewardService.js";

export const getMyRewards = catchAsync(async (req, res) => {
  const rewards = await getCustomerRewards(req.user._id);
  res.status(200).json({ status: "success", data: { rewards } });
});

export const createPromotionQuote = catchAsync(async (req, res) => {
  const quote = await quotePromotion({ customerId: req.user._id, ...req.body });
  res.status(200).json({ status: "success", data: { quote } });
});
