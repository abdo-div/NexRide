import express from "express";
import { z } from "zod";

import { initializePayment, receiveWebhook } from "../controllers/paymentAggregatorController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { objectId } from "../validations/common.validation.js";

const router = express.Router();

router.post("/webhook", receiveWebhook);
router.post(
  "/init",
  protect,
  restrictTo("customer"),
  validate(z.object({ body: z.object({ bookingId: objectId }) })),
  initializePayment,
);

export default router;
