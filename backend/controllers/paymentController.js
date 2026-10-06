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
    req.tenantId ?? req.user?.company,
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

  // A company account without a resolvable tenant must fail closed: with a null
  // companyId the aggregation below would match every tenant's ledger.
  if (req.user.role === "company" && !companyId) {
    return next(
      new AppError("No company tenant is linked to this user account.", 403),
    );
  }

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

export const collectCashPayment = catchAsync(async (req, res, next) => {
  const { payment, booking } = await paymentService.markCashPaymentCompleted({
    paymentId: req.params.id,
    actorUser: req.user,
    tenantId: req.tenantId ?? req.user?.company,
  });

  res.status(200).json({
    status: "success",
    data: { payment, booking },
  });
});

export const downloadInvoicePDF = catchAsync(async (req, res, next) => {
  const payment = req.payment;

  if (!payment) {
    return next(
      new AppError("Payment details not found for invoice generation", 404)
    );
  }

  // The invoice embeds customer name, email and phone number, so ownership is
  // proven here as well as on the route. `verifyTenantAccess` covers the routed
  // path; this check keeps the guarantee attached to the handler itself so it
  // holds no matter how the route is wired.
  paymentService.assertInvoiceAccess(
    payment,
    req.user,
    req.tenantId ?? req.user?.company,
  );

  await streamInvoiceForPayment(res, payment);
});