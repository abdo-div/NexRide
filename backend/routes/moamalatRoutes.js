import express from "express";
import {
  getGatewayConfig,
  initiatePayment,
  verifyPayment,
} from "../controllers/moamalatController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  initiatePaymentSchema,
  verifyPaymentSchema,
} from "../validations/moamalat.validation.js";

const router = express.Router();

// Public: hands the browser the LightBox script URL. No secrets exposed.
router.get("/config", getGatewayConfig);

// Protected: customer-only payment lifecycle for their own bookings.
router.use(protect);

router.post(
  "/init",
  restrictTo("customer"),
  validate(initiatePaymentSchema),
  initiatePayment,
);

router.post(
  "/verify",
  restrictTo("customer"),
  validate(verifyPaymentSchema),
  verifyPayment,
);

export default router;