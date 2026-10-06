import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { buildCompanyReviews } from "../services/companyReviewsService.js";
import { addCompanyResponseToReview } from "../services/reviewService.js";

/**
 * Resolve the tenant the deck is scoped to. Company sessions are pinned to
 * `req.tenantId || req.user.company` — the query string is never trusted for a
 * company role — while an admin may target another operator via `?companyId=`.
 * Mirrors getCompanyBookings / getCompanyDashboard / getCompanyPayoutSummary.
 */
const resolveTenant = (req, next) => {
  const companyId =
    req.user.role === "company"
      ? req.tenantId || req.user.company
      : req.query.companyId;

  if (req.user.role === "company" && !companyId) {
    return next(
      new AppError("No company tenant is linked to this user account.", 403),
    );
  }

  return companyId;
};

/**
 * GET /companies/reviews — tenant-scoped reviews & ratings workspace. The
 * analytics deck and the paginated register are both recomputed from the
 * tenant's own Review documents; a company session cannot pivot onto another
 * operator's reviews.
 */
export const getCompanyReviews = catchAsync(async (req, res, next) => {
  const companyId = resolveTenant(req, next);

  const deck = await buildCompanyReviews({
    companyId,
    page: req.query.page,
    limit: req.query.limit,
    star: req.query.star,
    vehicleId: req.query.vehicleId,
    status: req.query.status,
    period: req.query.period,
  });

  res.status(200).json({
    status: "success",
    data: deck,
  });
});

/**
 * POST /companies/reviews/:id/reply — persist the operator's public reply on
 * one of its own reviews. Ownership is re-verified inside the service, so a
 * company can only reply to reviews left on its own fleet vehicles.
 */
export const replyToCompanyReview = catchAsync(async (req, res, next) => {
  const companyId = resolveTenant(req, next);

  const review = await addCompanyResponseToReview(
    req.params.id,
    req.body.response,
    companyId,
  );

  res.status(200).json({
    status: "success",
    data: { review },
  });
});