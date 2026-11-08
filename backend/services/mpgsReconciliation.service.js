import Payment from "../models/payment_model.js";
import Refund from "../models/Refund_model.js";
import { NexRideMpgsService } from "./mpgs.service.js";
import { processPendingMpgsRefundByBooking } from "./mpgsRefund.service.js";
import logger from "../utils/logger.js";

const DEFAULT_INTERVAL_MS = 2 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 50;

const isConfigured = (env = process.env) =>
  [
    "MPGS_BASE_URL",
    "MPGS_MERCHANT_ID",
    "MPGS_API_PASSWORD",
    "MPGS_API_VERSION",
    "MPGS_CURRENCY",
  ].every((name) => Boolean(env[name]?.trim()));

export const reconcileMpgs = async ({
  PaymentModel = Payment,
  RefundModel = Refund,
  paymentService = new NexRideMpgsService(),
  refundProcessor = processPendingMpgsRefundByBooking,
  batchSize = DEFAULT_BATCH_SIZE,
  env = process.env,
} = {}) => {
  if (!isConfigured(env)) {
    return { skipped: true, paymentsChecked: 0, refundsChecked: 0 };
  }

  const pendingPayments = await PaymentModel.find({
    paymentGateway: "MPGS",
    paymentMethod: "MPGS",
    status: "PENDING",
    merchantReference: { $type: "string" },
    gatewaySessionId: { $type: "string" },
  })
    .select("merchantReference customerId")
    .limit(batchSize)
    .lean();

  let paymentsCompleted = 0;
  let paymentFailures = 0;
  for (const payment of pendingPayments) {
    try {
      const result = await paymentService.verify({
        orderId: payment.merchantReference,
        customerId: payment.customerId,
      });
      if (result.verified) paymentsCompleted += 1;
    } catch (error) {
      paymentFailures += 1;
      logger.warn(
        { event: "mpgs_payment_reconciliation_failed", paymentId: payment._id, err: error.message },
        "MPGS payment reconciliation failed",
      );
    }
  }

  const pendingRefunds = await RefundModel.find({
    provider: "MPGS",
    $or: [
      { status: "PENDING" },
      { status: "FAILED", gatewayCode: null },
    ],
    gatewayRefundTransactionId: { $type: "string" },
  })
    .select("bookingId")
    .limit(batchSize)
    .lean();

  let refundsCompleted = 0;
  let refundFailures = 0;
  for (const refund of pendingRefunds) {
    try {
      const result = await refundProcessor(refund.bookingId);
      if (result.refunded || result.alreadyProcessed) refundsCompleted += 1;
    } catch (error) {
      refundFailures += 1;
      logger.warn(
        { event: "mpgs_refund_reconciliation_failed", refundId: refund._id, err: error.message },
        "MPGS refund reconciliation failed",
      );
    }
  }

  return {
    skipped: false,
    paymentsChecked: pendingPayments.length,
    paymentsCompleted,
    paymentFailures,
    refundsChecked: pendingRefunds.length,
    refundsCompleted,
    refundFailures,
  };
};

let timer = null;
let running = false;

export const startMpgsReconciliation = ({
  intervalMs = DEFAULT_INTERVAL_MS,
  run = reconcileMpgs,
} = {}) => {
  if (timer || !isConfigured()) return timer;
  const sweep = async () => {
    if (running) return;
    running = true;
    try {
      const result = await run();
      if (result.paymentsCompleted || result.refundsCompleted) {
        logger.info({ event: "mpgs_reconciliation_completed", ...result });
      }
    } catch (error) {
      logger.error({ event: "mpgs_reconciliation_sweep_failed", err: error.message });
    } finally {
      running = false;
    }
  };
  timer = setInterval(sweep, intervalMs);
  timer.unref?.();
  void sweep();
  logger.info({ intervalMs }, "MPGS reconciliation worker started");
  return timer;
};

export const stopMpgsReconciliation = () => {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  running = false;
  logger.info("MPGS reconciliation worker stopped");
};

export const __testing = { isConfigured, DEFAULT_INTERVAL_MS };
