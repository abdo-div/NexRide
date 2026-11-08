import express from "express";
import {
  getMpgsConfig,
  initiateMpgsPayment,
  verifyMpgsPayment,
  processMpgsRefund,
  initiateMpgsSimulation,
  completeMpgsSimulation,
} from "../controllers/mpgsController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { idempotency } from "../middlewares/idempotence.middleware.js";
import { paymentVerificationLimiter } from "../middlewares/rateLimitMiddleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  initiateMpgsPaymentSchema,
  verifyMpgsPaymentSchema,
  processMpgsRefundSchema,
  completeMpgsSimulationSchema,
} from "../validations/mpgs.validation.js";

const router = express.Router();

router.get("/config", getMpgsConfig);
router.post(
  "/simulator/init",
  protect,
  restrictTo("customer"),
  idempotency(86400),
  validate(initiateMpgsPaymentSchema),
  initiateMpgsSimulation,
);
router.post(
  "/simulator/complete",
  protect,
  restrictTo("customer"),
  idempotency(86400),
  validate(completeMpgsSimulationSchema),
  completeMpgsSimulation,
);
router.post(
  "/init",
  protect,
  restrictTo("customer"),
  idempotency(86400),
  validate(initiateMpgsPaymentSchema),
  initiateMpgsPayment,
);
router.post(
  "/refunds/process",
  protect,
  restrictTo("customer"),
  idempotency(86400),
  validate(processMpgsRefundSchema),
  processMpgsRefund,
);
router.post(
  "/verify",
  protect,
  restrictTo("customer"),
  paymentVerificationLimiter,
  validate(verifyMpgsPaymentSchema),
  verifyMpgsPayment,
);

export default router;
