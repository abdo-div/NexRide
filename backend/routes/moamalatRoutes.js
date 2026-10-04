import express from "express";
import {
  getGatewayConfig,
  createPayment,
  initiatePayment,
  verifyPayment,
} from "../controllers/moamalatController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { idempotency } from "../middlewares/idempotence.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  initiatePaymentSchema,
  verifyPaymentSchema,
} from "../validations/moamalat.validation.js";

const router = express.Router();

// Public: hands the browser the LightBox script URL. No secrets exposed.
router.get("/config", getGatewayConfig);

// Payment creation & initialization routes
router.post(
  "/create",
  protect,
  restrictTo("customer"),
  idempotency(86400),
  validate(initiatePaymentSchema),
  createPayment,
);
router.post(
  "/init",
  protect,
  restrictTo("customer"),
  idempotency(86400),
  validate(initiatePaymentSchema),
  initiatePayment,
);

// Verification route
router.post("/verify", validate(verifyPaymentSchema), verifyPayment);

export default router;