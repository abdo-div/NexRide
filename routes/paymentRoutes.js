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
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// -----------------------------------------------------------------------------
// WEBHOOK ROUTES (must be before protect middleware, no auth required)
// -----------------------------------------------------------------------------
router.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

// -----------------------------------------------------------------------------
// PROTECTED TRANSACTION ROUTES
// -----------------------------------------------------------------------------
router.use(protect);

router.post("/process", restrictTo("customer"), processPayment);

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
router.get("/:id/invoice", getPaymentById, downloadInvoicePDF);

router.get("/:id", verifyTenantAccess("Payment"), getPaymentById);

// -----------------------------------------------------------------------------
// PLATFORM ADMIN ONLY ROUTES
// -----------------------------------------------------------------------------
router.patch(
  ["/:id/settle-payout", "/:id/settlePayout"],
  restrictTo("admin"),
  settleCompanyPayout,
);

export default router;
