import catchAsync from "../utils/catchAsync.js";
import {
  initializeAggregatorPayment,
  processAggregatorWebhook,
  verifyAggregatorWebhook,
} from "../services/paymentAggregator.service.js";

export const initializePayment = catchAsync(async (req, res) => {
  const result = await initializeAggregatorPayment({
    bookingId: req.body.bookingId,
    customerId: req.user?._id ?? req.user?.id,
  });
  res.status(200).json({
    status: "success",
    data: {
      paymentId: result.payment._id,
      aggregatorPaymentId: result.payment.aggregatorPaymentId,
      checkoutUrl: result.checkoutUrl,
      expiresAt: result.payment.aggregatorCheckoutExpiresAt,
      reused: result.reused,
    },
  });
});

export const receiveWebhook = catchAsync(async (req, res) => {
  const rawBody = req.rawBody?.toString("utf8") ?? JSON.stringify(req.body);
  verifyAggregatorWebhook({
    rawBody,
    timestamp: req.get("webhook-timestamp"),
    signature: req.get("webhook-signature"),
  });
  await processAggregatorWebhook(req.body);
  res.status(204).send();
});
