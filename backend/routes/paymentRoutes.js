import express from "express";
import {
  processPayment,
  getPaymentById,
  getAllPayments,
  getCompanyPayoutSummary,
  settleCompanyPayout,
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
router.get("/", restrictTo("company", "admin"), getAllPayments);

router.get(
  ["/tenant/payout-summary", "/tenant/payoutSummary"],
  restrictTo("company", "admin"),
  getCompanyPayoutSummary,
);

// Parameterized routes come last
router.get(
  "/:id/invoice",
  validate(idParamSchema()),
  getPaymentById,
  downloadInvoicePDF,
);

router.get(
  "/:id",
  validate(idParamSchema()),
  verifyTenantAccess("Payment"),
  getPaymentById,
);

// -----------------------------------------------------------------------------
// PLATFORM ADMIN ONLY ROUTES
// -----------------------------------------------------------------------------
router.patch(
  ["/:id/settle-payout", "/:id/settlePayout"],
  restrictTo("admin"),
  validate(idParamSchema()),
  settleCompanyPayout,
);

export default router;
