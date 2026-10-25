import express from "express";
import {
  getGatewayConfig,
  diagnose,
  createPayment,
  initiatePayment,
  simulateTestPayment,
  verifyPayment,
  releasePayment,
} from "../controllers/moamalatController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { idempotency } from "../middlewares/idempotence.middleware.js";
import { paymentVerificationLimiter } from "../middlewares/rateLimitMiddleware.js";
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

// DEV-ONLY: Hash/config diagnostics (returns 404 in production)
router.get("/diagnose", diagnose);

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

// Presentation-only fallback. The controller returns 404 unless the deployed
// gateway is explicitly in test mode; production Moamalat can never use it.
router.post(
  "/simulate",
  protect,
  restrictTo("customer"),
  idempotency(86400),
  validate(initiatePaymentSchema),
  simulateTestPayment,
);

// Verification route

/**
 * @openapi
 * /payments/moamalat/verify:
 *   post:
 *     tags: [Moamalat]
 *     summary: Verify a completed Moamalat payment
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
router.post(
  "/verify",
  protect,
  restrictTo("customer"),
  paymentVerificationLimiter,
  validate(verifyPaymentSchema),
  verifyPayment,
);

/**
 * @openapi
 * /payments/moamalat/release:
 *   post:
 *     tags: [Moamalat]
 *     summary: Release a booking whose payment did not succeed
 *     description: >
 *       Retires an unpaid PENDING_PAYMENT booking and returns its vehicle to the
 *       market, so a failed Moamalat payment never keeps the car rented. Only
 *       the owning customer may release their own booking.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId]
 *             properties:
 *               bookingId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Release outcome for the booking
 *       403:
 *         description: Customer role required
 */
router.post(
  "/release",
  protect,
  restrictTo("customer"),
  idempotency(86400),
  validate(initiatePaymentSchema),
  releasePayment,
);

export default router;
