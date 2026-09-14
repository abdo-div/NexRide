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
// WEBHOOK ROUTES (External Payment Gateways)
// -----------------------------------------------------------------------------
// Note: Webhooks must process raw body payloads for signature verification
router.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

// -----------------------------------------------------------------------------
// PROTECTED TRANSACTION ROUTES
// -----------------------------------------------------------------------------
// Enforce JWT authentication for all standard payment endpoints
router.use(protect);

// Execute payment intent (Executes inside Mongoose ACID session: updates Payment, Booking, and Vehicle status atomically)
router.post("/process", restrictTo("customer"), processPayment);

// Generate & Stream secure PDF invoice for a completed transaction
router.get(
  "/:id/invoice",
  getPaymentById, // Reuses access check
  downloadInvoicePDF,
);

// Fetch detailed record of a specific transaction (Customers see own, Company sees tenant payments, Admin sees all)
router.get("/:id", verifyTenantAccess("Payment"), getPaymentById);

// -----------------------------------------------------------------------------
// TENANT & ADMIN FINANCIAL REPORTING
// -----------------------------------------------------------------------------

// Multi-tenant financial ledger query (Company owners view their earnings; Admins view global platform revenue)
router.get("/", restrictTo("company", "admin"), getAllPayments);

// Dashboard summary route: Calculates total revenue, pending payouts, and platform commission splits
router.get(
  "/tenant/payout-summary",
  restrictTo("company", "admin"),
  getCompanyPayoutSummary,
);

// -----------------------------------------------------------------------------
// PLATFORM ADMIN ONLY ROUTES (Financial Governance & Payouts)
// -----------------------------------------------------------------------------

// Settle company payout (Marks unsettled transactions as SETTLED and records transfer timestamp)
router.patch("/:id/settle-payout", restrictTo("admin"), settleCompanyPayout);

export default router;
