import express from "express";
import {
  processPayment,
  getPaymentById,
  getAllPayments,
  getCompanyPayoutSummary,
  settleCompanyPayout,
  handleStripeWebhook,
  downloadInvoicePDF,
} from "../controllers/paymentController.js";
import {
  protect,
  restrictTo,
  verifyTenantAccess,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// -----------------------------------------------------------------------------
// WEBHOOK ROUTES
// -----------------------------------------------------------------------------
router.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

// -----------------------------------------------------------------------------
// PROTECTED TRANSACTION ROUTES
// -----------------------------------------------------------------------------
router.use(protect);

router.post("/process", restrictTo("customer"), processPayment);

router.get(
  "/:id/invoice",
  getPaymentById,
  downloadInvoicePDF
);

router.get("/:id", verifyTenantAccess("Payment"), getPaymentById);

// -----------------------------------------------------------------------------
// TENANT & ADMIN FINANCIAL REPORTING
// -----------------------------------------------------------------------------
router.get("/", restrictTo("company", "admin"), getAllPayments);

router.get(
  "/tenant/payout-summary",
  restrictTo("company", "admin"),
  getCompanyPayoutSummary
);

// -----------------------------------------------------------------------------
// PLATFORM ADMIN ONLY ROUTES
// -----------------------------------------------------------------------------
router.patch("/:id/settle-payout", restrictTo("admin"), settleCompanyPayout);

export default router;