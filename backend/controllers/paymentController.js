import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import * as paymentService from "../services/paymentService.js";
import { streamInvoiceForPayment } from "../services/invoiceService.js";

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

  // If called directly via endpoint GET /:id (not chained from invoice route)
  if (!req.route || !req.route.path.includes("invoice")) {
    return res.status(200).json({
      status: "success",
      data: { payment },
    });
  }

  next();
});

export const getAllPayments = catchAsync(async (req, res, next) => {
  const { payments, pagination } = await paymentService.fetchAllPayments(
    req.query,
    req.user,
  );

  res.status(200).json({
    status: "success",
    results: payments.length,
    pagination,
    data: { payments },
  });
});

export const getCompanyPayoutSummary = catchAsync(async (req, res, next) => {
  const companyId =
    req.user.role === "company"
      ? req.tenantId || req.user.company
      : req.query.companyId;

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

export const downloadInvoicePDF = catchAsync(async (req, res, next) => {
  const payment = req.payment;

  if (!payment) {
    return next(
      new AppError("Payment details not found for invoice generation", 404)
    );
  }

  await streamInvoiceForPayment(res, payment);
});