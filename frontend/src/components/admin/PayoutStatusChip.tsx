import React from "react";
import { useTranslation } from "react-i18next";
import type { LedgerPayoutStatus } from "../../types/admin";

const TONE: Record<LedgerPayoutStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  PROCESSING: "bg-blue-50 text-blue-700",
  PAID: "bg-emerald-50 text-emerald-700",
  ADJUSTED: "bg-rose-50 text-rose-700",
  CLEARED: "bg-slate-100 text-slate-500",
};

const DOT: Record<LedgerPayoutStatus, string> = {
  PENDING: "bg-amber-500",
  PROCESSING: "bg-blue-500",
  PAID: "bg-emerald-500",
  ADJUSTED: "bg-rose-500",
  CLEARED: "bg-slate-400",
};

/**
 * Small pill for the derived clearing-ledger lifecycle statuses
 * (PENDING / PROCESSING / PAID / ADJUSTED / CLEARED), labelled from the
 * bilingually translated admin.commissions.statuses block.
 */
export const PayoutStatusChip: React.FC<{ status: LedgerPayoutStatus }> = ({
  status,
}) => {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center text-nowrap gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ${TONE[status]}`}>
        {t(`admin.commissions.statuses.${status}`)}
      </span>
    </span>
  );
};

export default PayoutStatusChip;