import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import * as paymentService from "../services/paymentService.js";

export const processPayment = catchAsync(async (req, res, next) => {
  const payment = await paymentService.executePaymentProcessing(
    req.body,
    req.user.id
  );

  res.status(200).json({
    status: "success",
    data: { payment },
  });
});

export const getPaymentById = catchAsync(async (req, res, next) => {
  const payment = await paymentService.fetchPaymentById(req.params.id);

  // Attach to req object for downstream middleware (e.g., downloadInvoicePDF)
  req.payment = payment;

  // If called directly via endpoint GET /:id
  if (!req.route.path.includes("invoice")) {
    return res.status(200).json({
      status: "success",
      data: { payment },
    });
  }

  next();
});

export const getAllPayments = catchAsync(async (req, res, next) => {
  const payments = await paymentService.fetchAllPayments(req.query, req.user);

  res.status(200).json({
    status: "success",
    results: payments.length,
    data: { payments },
  });
});

export const getCompanyPayoutSummary = catchAsync(async (req, res, next) => {
  const companyId = req.user.role === "company" ? (req.tenantId || req.user.company) : req.query.companyId;

  const summary = await paymentService.calculateCompanyPayoutSummary(companyId);

  res.status(200).json({
    status: "success",
    data: { summary },
  });
});

export const settleCompanyPayout = catchAsync(async (req, res, next) => {
  const payment = await paymentService.settlePaymentPayout(req.params.id);

  res.status(200).json({
    status: "success",
    data: { payment },
  });
});

export const handleStripeWebhook = catchAsync(async (req, res, next) => {
  const signature = req.headers["stripe-signature"];

  await paymentService.processStripeWebhookEvent(req.body, signature);

  res.status(200).json({ received: true });
});

export const downloadInvoicePDF = catchAsync(async (req, res, next) => {
  const payment = req.payment;

  if (!payment) {
    return next(new AppError("Payment details not found for invoice generation", 404));
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice-${payment._id}.pdf`
  );

  // Example placeholder for streaming generated PDF document
  res.status(200).send(`Invoice PDF binary buffer for Transaction ${payment._id}`);
});