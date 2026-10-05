import mongoose from "mongoose";
import Payment from "../models/payment_model.js";
import {
  buildPaginationMeta,
  resolvePagination,
} from "../utils/pagination.js";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Platform-wide settlement KPIs. Everything is aggregated live from the real
 * Payment ledger (commission snaps compromised contractually at payment time),
 * so the numbers shown in the Commissions & Payouts dashboard are never
 * fabricated client-side.
 */
export const buildPayoutSummary = async () => {
  const [totals] = await Payment.aggregate([
    { $match: { status: { $in: ["COMPLETED", "REFUNDED"] } } },
    {
      $group: {
        _id: null,
        gross: {
          $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, "$amount", 0] },
        },
        platformTake: {
          $sum: {
            $cond: [{ $eq: ["$status", "COMPLETED"] }, "$commissionAmount", 0],
          },
        },
        companyEarnings: {
          $sum: {
            $cond: [{ $eq: ["$status", "COMPLETED"] }, "$companyShare", 0],
          },
        },
        unsettled: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "COMPLETED"] },
                  { $eq: ["$payoutStatus", "UNSETTLED"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        processing: {
          $sum: {
            $cond: [{ $eq: ["$payoutStatus", "PROCESSING"] }, "$amount", 0],
          },
        },
        settled: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "COMPLETED"] },
                  { $eq: ["$payoutStatus", "SETTLED"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        adjustments: {
          $sum: { $cond: [{ $eq: ["$status", "REFUNDED"] }, "$amount", 0] },
        },
        bookings: {
          $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
        },
        partners: { $addToSet: "$companyId" },
      },
    },
  ]);

  const base = totals ?? {
    gross: 0,
    platformTake: 0,
    companyEarnings: 0,
    unsettled: 0,
    processing: 0,
    settled: 0,
    adjustments: 0,
    bookings: 0,
    partners: [],
  };

  return {
    gross: base.gross,
    bookings: base.bookings,
    platformTake: base.platformTake,
    companyEarnings: base.companyEarnings,
    effectiveRate:
      base.gross > 0 ? (base.platformTake / base.gross) * 100 : 0,
    pendingPayouts: base.unsettled + base.processing,
    paidPayouts: base.settled,
    adjustments: base.adjustments,
    paidRatio:
      base.gross > 0 ? (base.settled / base.gross) * 100 : 0,
    partnerCount: Array.isArray(base.partners)
      ? base.partners.filter(Boolean).length
      : 0,
    activeRuns: await Payment.countDocuments({
      status: "COMPLETED",
      payoutStatus: { $in: ["UNSETTLED", "PROCESSING"] },
    }),
  };
};

const payoutStatusOf = (row) => {
  if (row.unsettled > 0) return "PENDING";
  if (row.processing > 0) return "PROCESSING";
  if (row.settled > 0) return "PAID";
  if (row.adjustments > 0) return "ADJUSTED";
  return "CLEARED";
};

/**
 * Per-fleet-operator settlement rows for the clearing ledger. Each row is the
 * live aggregate of that partner's payment ledger (gross GMV, NexRide fee, net
 * share, pending/settled balances) joined with the company record for naming.
 */
export const buildPayoutLedger = async ({ companyId, search, ...paginationQuery } = {}) => {
  const match = { status: { $in: ["COMPLETED", "REFUNDED"] } };
  if (companyId) {
    match.companyId = new mongoose.Types.ObjectId(companyId);
  }

  const { page, limit, skip } = resolvePagination(paginationQuery);

  const searchTerm = typeof search === "string" ? search.trim() : "";
  const searchFilter =
    searchTerm.length > 0
      ? {
          $or: [
            { "company.name": new RegExp(escapeRegExp(searchTerm), "i") },
            { "company.city": new RegExp(escapeRegExp(searchTerm), "i") },
          ],
        }
      : null;

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: "$companyId",
        bookings: {
          $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
        },
        gross: {
          $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, "$amount", 0] },
        },
        fee: {
          $sum: {
            $cond: [{ $eq: ["$status", "COMPLETED"] }, "$commissionAmount", 0],
          },
        },
        net: {
          $sum: {
            $cond: [{ $eq: ["$status", "COMPLETED"] }, "$companyShare", 0],
          },
        },
        unsettled: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "COMPLETED"] },
                  { $eq: ["$payoutStatus", "UNSETTLED"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        processing: {
          $sum: { $cond: [{ $eq: ["$payoutStatus", "PROCESSING"] }, "$amount", 0] },
        },
        settled: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "COMPLETED"] },
                  { $eq: ["$payoutStatus", "SETTLED"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        adjustments: {
          $sum: { $cond: [{ $eq: ["$status", "REFUNDED"] }, "$amount", 0] },
        },
        lastPayoutSetAt: { $max: "$payoutSettledAt" },
        lastPaidAt: { $max: "$paidAt" },
      },
    },
    {
      $lookup: {
        from: "companies",
        localField: "_id",
        foreignField: "_id",
        as: "company",
      },
    },
    { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        company: {
          _id: "$company._id",
          name: "$company.name",
          city: "$company.city",
          status: "$company.status",
          customCommissionRate: "$company.customCommissionRate",
        },
        bookings: 1,
        gross: 1,
        fee: 1,
        net: 1,
        unsettled: 1,
        processing: 1,
        settled: 1,
        adjustments: 1,
        lastPayoutSetAt: 1,
        lastPaidAt: 1,
      },
    },
  ];

  if (searchFilter) {
    pipeline.push({ $match: searchFilter });
  }

  // The ledger is aggregated to one row per fleet operator, so the window is
  // applied with $facet: one branch returns the requested page, the other the
  // total row count for the very same pipeline (so filters and total agree).
  const [facet] = await Payment.aggregate([
    ...pipeline,
    {
      $facet: {
        rows: [
          { $sort: { gross: -1, "_id": 1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        meta: [{ $count: "total" }],
      },
    },
  ]);

  const total = facet?.meta?.[0]?.total ?? 0;

  return {
    ledger: (facet?.rows ?? []).map((row) => ({
      ...row,
      payoutStatus: payoutStatusOf(row),
    })),
    pagination: buildPaginationMeta({ page, limit, total }),
  };
};

/**
 * Generate the dispatching run for every unsettled COMPLETED payment (optionally
 * restricted to a set of fleet operators) — the "LFB rail" batch. Returns a
 * deterministic batch reference plus how many payments were marked PROCESSING.
 */
export const dispatchPayoutBatch = async (companyIds) => {
  const filter = { status: "COMPLETED", payoutStatus: "UNSETTLED" };
  if (Array.isArray(companyIds) && companyIds.length > 0) {
    filter.companyId = {
      $in: companyIds.map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  const affected = await Payment.distinct("companyId", filter);

  const result = await Payment.updateMany(filter, {
    $set: { payoutStatus: "PROCESSING" },
  });

  const now = new Date();
  const batchRef = `LFB-${now.getUTCFullYear()}-${String(
    now.getUTCMonth() + 1,
  ).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

  return {
    batchRef,
    dispatched: result.modifiedCount,
    companies: affected.filter(Boolean).length,
  };
};

/**
 * Approve & dispatch a fleet operator's payout (the dossier's primary action).
 * Marks every unsettled/processing payment for that operator as SETTLED with a
 * payoutSettledAt timestamp. With no operator supplied the whole queue settles.
 */
export const settlePayoutBatch = async (companyId) => {
  const filter = {
    status: "COMPLETED",
    payoutStatus: { $in: ["UNSETTLED", "PROCESSING"] },
  };
  if (companyId) {
    filter.companyId = new mongoose.Types.ObjectId(companyId);
  }

  const result = await Payment.updateMany(filter, {
    $set: { payoutStatus: "SETTLED", payoutSettledAt: new Date() },
  });

  return { settled: result.modifiedCount };
};