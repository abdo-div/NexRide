import express from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createPromotionQuote, getMyRewards } from "../controllers/rewardController.js";
import { promotionQuoteSchema } from "../validations/reward.validation.js";

const router = express.Router();
router.use(protect, restrictTo("customer"));
router.get("/me", getMyRewards);
router.post("/promotion-quote", validate(promotionQuoteSchema), createPromotionQuote);
export default router;
