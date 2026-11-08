import Refund from "../models/Refund_model.js";
import Payment from "../models/payment_model.js";
import AppError from "../utils/appError.js";
import { createConfiguredMpgsProvider } from "../config/mpgs.js";

const idOf = (value) => (value?._id ?? value)?.toString();

const refundTransactionIdFor = (refund) => {
  const suffix = String(refund._id).replace(/[^A-Za-z0-9_-]/g, "").slice(-32);
  return `RF-${suffix}`.slice(0, 40);
};

/**
 * Claims and processes the one cancellation refund attached to a NexRide
 * payment. The durable refund transaction ID is reused after network failures,
 * making retries idempotent at MPGS.
 */
export const processPendingMpgsRefundByBooking = async (
  bookingId,
  {
    customerId = null,
    RefundModel = Refund,
    PaymentModel = Payment,
    providerFactory = createConfiguredMpgsProvider,
  } = {},
) => {
  const refund = await RefundModel.findOne({ bookingId }).sort({ createdAt: -1 });
  if (!refund) return { skipped: true, reason: "NO_REFUND" };

  const payment = await PaymentModel.findById(refund.paymentId);
  if (!payment) throw new AppError("Refund payment record was not found.", 404);
  if (customerId && idOf(refund.customerId) !== String(customerId)) {
    throw new AppError("You can only process your own refund.", 403);
  }
  if (payment.paymentGateway !== "MPGS" || payment.paymentMethod !== "MPGS") {
    return { skipped: true, reason: "NOT_MPGS", refund };
  }
  if (refund.status === "COMPLETED") {
    return { skipped: false, alreadyProcessed: true, outcome: "SUCCEEDED", refund };
  }
  if (!payment.merchantReference || !payment.transactionId) {
    throw new AppError("The MPGS payment is missing its gateway references.", 409);
  }

  const claimed = await RefundModel.findOneAndUpdate(
    { _id: refund._id, status: { $in: ["PENDING", "FAILED"] } },
    {
      $set: {
        status: "PROCESSING",
        processingAt: new Date(),
        failedAt: null,
        failureReason: null,
        gatewayCode: null,
      },
    },
    { new: true, runValidators: true },
  );
  if (!claimed) {
    return { skipped: false, alreadyProcessing: true, outcome: "PENDING", refund };
  }

  const refundTransactionId =
    claimed.gatewayRefundTransactionId || refundTransactionIdFor(claimed);
  claimed.provider = "MPGS";
  claimed.gatewayOrderId = payment.merchantReference;
  claimed.gatewayRefundTransactionId = refundTransactionId;
  claimed.gatewayTargetTransactionId = payment.transactionId;
  await claimed.save();

  try {
    const result = await providerFactory().refundPayment({
      orderId: payment.merchantReference,
      refundTransactionId,
      targetTransactionId: payment.transactionId,
      amount: String(claimed.amount),
      currency: claimed.currency || payment.currency,
    });

    claimed.gatewayCode = result.gatewayCode;
    if (result.refunded) {
      claimed.status = "COMPLETED";
      claimed.completedAt = new Date();
      claimed.failedAt = null;
      claimed.failureReason = null;
    } else if (result.outcome === "PENDING") {
      claimed.status = "PENDING";
      claimed.failureReason = "MPGS refund is pending confirmation";
    } else {
      claimed.status = "FAILED";
      claimed.failedAt = new Date();
      claimed.failureReason = result.gatewayCode || "MPGS rejected the refund";
    }
    await claimed.save();
    return {
      skipped: false,
      alreadyProcessed: false,
      outcome: result.outcome,
      refunded: result.refunded,
      refund: claimed,
      gateway: result,
    };
  } catch (error) {
    // The same transaction ID is retained. Retrying it lets MPGS resolve an
    // ambiguous network outcome without creating a second refund transaction.
    claimed.status = "FAILED";
    claimed.failedAt = new Date();
    claimed.failureReason = error instanceof Error ? error.message : "MPGS refund failed";
    await claimed.save();
    throw error;
  }
};
