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

/**
 * @openapi
 * /payments/moamalat/config:
 *   get:
 *     tags: [Moamalat]
 *     summary: Public LightBox configuration
 *     description: Returns only the browser-facing script URL. No credentials.
 *     security: []
 *     responses:
 *       200:
 *         description: LightBox configuration
 */
router.get("/config", getGatewayConfig);

// Payment creation & initialization routes

/**
 * @openapi
 * /payments/moamalat/create:
 *   post:
 *     tags: [Moamalat]
 *     summary: Create a Moamalat payment record
 *     responses:
 *       201:
 *         description: Payment record created
 *       403:
 *         description: Customer role required
 */
router.post(
  "/create",
  protect,
  restrictTo("customer"),
  idempotency(86400),
  validate(initiatePaymentSchema),
  createPayment,
);

/**
 * @openapi
 * /payments/moamalat/init:
 *   post:
 *     tags: [Moamalat]
 *     summary: Initialize a Moamalat checkout session
 *     responses:
 *       200:
 *         description: LightBox configuration for the session
 *       403:
 *         description: Customer role required
 */
router.post(
  "/init",
  protect,
  restrictTo("customer"),
  idempotency(86400),
  validate(initiatePaymentSchema),
  initiatePayment,
);

// Verification route

/**
 * @openapi
 * /payments/moamalat/verify:
 *   post:
 *     tags: [Moamalat]
 *     summary: Verify a completed Moamalat payment
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, paymentId]
 *             properties:
 *               bookingId:
 *                 type: string
 *               paymentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified and booking updated
 *       400:
 *         description: Verification failed
 */
router.post("/verify", validate(verifyPaymentSchema), verifyPayment);

export default router;