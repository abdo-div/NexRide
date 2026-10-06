import express from "express";
import {
  processPayment,
  getPaymentById,
  getAllPayments,
  getCompanyPayoutSummary,
  settleCompanyPayout,
  collectCashPayment,
  downloadInvoicePDF,
} from "../controllers/paymentController.js";
import {
  protect,
  restrictTo,
  verifyTenantAccess,
} from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idempotency } from "../middlewares/idempotence.middleware.js";
import { processPaymentSchema } from "../validations/payment.validation.js";
import { idParamSchema } from "../validations/common.validation.js";

const router = express.Router();

// -----------------------------------------------------------------------------
// PROTECTED TRANSACTION ROUTES
// -----------------------------------------------------------------------------
router.use(protect);
router.use(idempotency(86400));

/**
 * @openapi
 * /payments/process:
 *   post:
 *     tags: [Payments]
 *     summary: Pay a booking with cash or Moamalat
 *     description: >-
 *       Moamalat is the only supported card gateway. Cash bookings settle on
 *       pick-up; card bookings hand off to the Moamalat flow under
 *       /payments/moamalat/*.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, amount, paymentMethod]
 *             properties:
 *               bookingId:
 *                 type: string
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, moamalat]
 *     responses:
 *       200:
 *         description: Payment recorded
 *       400:
 *         description: Validation error
 *       403:
 *         description: Customer role required
 */
router.post(
  "/process",
  restrictTo("customer"),
  validate(processPaymentSchema),
  processPayment,
);

// -----------------------------------------------------------------------------
// TENANT & ADMIN FINANCIAL REPORTING
// -----------------------------------------------------------------------------

// IMPORTANT: static/specific routes MUST come before /:id parameterized routes
/**
 * @openapi
 * /payments:
 *   get:
 *     tags: [Payments]
 *     summary: List payments visible to the tenant or admin
 *     responses:
 *       200:
 *         description: Paginated payment list
 *       403:
 *         description: Company or admin role required
 */
router.get("/", restrictTo("company", "admin"), getAllPayments);

/**
 * @openapi
 * /payments/tenant/payout-summary:
 *   get:
 *     tags: [Payments]
 *     summary: Aggregated payout summary for the authenticated company
 *     responses:
 *       200:
 *         description: Payout KPI summary
 *       403:
 *         description: Company or admin role required
 */
router.get(
  ["/tenant/payout-summary", "/tenant/payoutSummary"],
  restrictTo("company", "admin"),
  getCompanyPayoutSummary,
);

/**
 * @openapi
 * /payments/{id}/invoice:
 *   get:
 *     tags: [Payments]
 *     summary: Download the payment invoice PDF
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice PDF
 *       403:
 *         description: Tenant access denied
 *       404:
 *         description: Payment not found
 */
router.get(
  "/:id/invoice",
  validate(idParamSchema()),
  // Invoices embed customer name, email and phone number. Without this gate
  // any authenticated user could enumerate payment IDs and download another
  // tenant's invoice. Mirrors the protection on GET /:id.
  verifyTenantAccess("Payment"),
  getPaymentById,
  downloadInvoicePDF,
);

/**
 * @openapi
 * /payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Payment detail (tenant-scoped)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment document
 *       403:
 *         description: Tenant access denied
 *       404:
 *         description: Payment not found
 */
router.get(
  "/:id",
  validate(idParamSchema()),
  verifyTenantAccess("Payment"),
  getPaymentById,
);

// -----------------------------------------------------------------------------
// TENANT & ADMIN CASH COLLECTION
// -----------------------------------------------------------------------------
/**
 * @openapi
 * /payments/{id}/collect-cash:
 *   patch:
 *     tags: [Payments]
 *     summary: Mark a cash-on-delivery payment as collected
 *     description: >-
 *       Cash has no gateway callback, so the owning company (or a platform
 *       admin) attests the hand-off at pick-up. Transitions the ledger row
 *       from PENDING to COMPLETED and marks the booking as paid, which is what
 *       moves it into revenue analytics and the payout ledger.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cash collection recorded
 *       400:
 *         description: Payment method is not cash
 *       403:
 *         description: Company or admin role required
 *       404:
 *         description: Payment not found
 *       409:
 *         description: Payment is not pending (already collected or refunded)
 */
router.patch(
  "/:id/collect-cash",
  restrictTo("company", "admin"),
  validate(idParamSchema()),
  verifyTenantAccess("Payment"),
  collectCashPayment,
);

// -----------------------------------------------------------------------------
// PLATFORM ADMIN ONLY ROUTES
// -----------------------------------------------------------------------------
/**
 * @openapi
 * /payments/{id}/settle-payout:
 *   patch:
 *     tags: [Admin]
 *     summary: Settle a payment payout
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payout settled
 *       403:
 *         description: Admin role required
 */
router.patch(
  ["/:id/settle-payout", "/:id/settlePayout"],
  restrictTo("admin"),
  validate(idParamSchema()),
  settleCompanyPayout,
);

export default router;
