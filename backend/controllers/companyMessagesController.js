import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import {
  buildCompanyConversations,
  getConversationThread,
  sendAgentMessage,
  markConversationRead,
  markAllConversationsRead,
  broadcastNotice,
} from "../services/companyMessagesService.js";

/**
 * Resolve the tenant the inbox is scoped to. Company sessions are pinned to
 * `req.tenantId || req.user.company` — the query string is never trusted for a
 * company role — while an admin may target another operator via `?companyId=`.
 * Mirrors getCompanyBookings / getCompanyDashboard / getCompanyReviews.
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

const agentNameOf = (req) =>
  req.user?.name || req.user?.companyName || "Fleet Operator";

/**
 * GET /companies/conversations — tenant-scoped inbox deck (KPI ribbon,
 * quick-filter counts) plus a paginated conversation feed.
 */
export const getCompanyConversations = catchAsync(async (req, res, next) => {
  const companyId = resolveTenant(req, next);

  const deck = await buildCompanyConversations({
    companyId,
    page: req.query.page,
    limit: req.query.limit,
    view: req.query.view,
    channel: req.query.channel,
    q: req.query.q,
  });

  res.status(200).json({ status: "success", data: deck });
});

/**
 * GET /companies/conversations/:id — full thread. Opening it clears the
 * company unread receipt from real message rows.
 */
export const getCompanyConversationThread = catchAsync(
  async (req, res, next) => {
    const companyId = resolveTenant(req, next);

    const thread = await getConversationThread({
      companyId,
      conversationId: req.params.id,
    });

    res.status(200).json({ status: "success", data: thread });
  },
);

/**
 * POST /companies/conversations/:id/messages — append an agent reply.
 */
export const postCompanyConversationMessage = catchAsync(
  async (req, res, next) => {
    const companyId = resolveTenant(req, next);

    const message = await sendAgentMessage({
      companyId,
      conversationId: req.params.id,
      body: req.body.body,
      agentName: agentNameOf(req),
    });

    res.status(201).json({ status: "success", data: { message } });
  },
);

/**
 * PATCH /companies/conversations/:id/read — clear one thread's unread badge.
 */
export const patchCompanyConversationRead = catchAsync(
  async (req, res, next) => {
    const companyId = resolveTenant(req, next);

    const result = await markConversationRead({
      companyId,
      conversationId: req.params.id,
    });

    res.status(200).json({ status: "success", data: result });
  },
);

/**
 * PATCH /companies/conversations/read-all — clear the whole tenant inbox.
 */
export const patchCompanyConversationsReadAll = catchAsync(
  async (req, res, next) => {
    const companyId = resolveTenant(req, next);

    const result = await markAllConversationsRead({ companyId });

    res.status(200).json({ status: "success", data: result });
  },
);

/**
 * POST /companies/conversations/broadcast — write a real notice into every
 * OPEN conversation of the tenant.
 */
export const postCompanyBroadcast = catchAsync(async (req, res, next) => {
  const companyId = resolveTenant(req, next);

  const result = await broadcastNotice({
    companyId,
    body: req.body.body,
    agentName: agentNameOf(req),
  });

  res.status(201).json({ status: "success", data: result });
});
