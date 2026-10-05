import React from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarClock,
  CircleCheck,
  FileText,
  MoreHorizontal,
  Wallet,
} from "lucide-react";
import type { AdminPayoutRow, PaginationMeta } from "../../types/admin";
import { formatDate, formatLYD } from "../../lib/bookingView";
import {
  effectiveRateOf,
  payoutCodeOf,
} from "../../lib/commissionView";
import { PayoutStatusChip } from "./PayoutStatusChip";
import { AdminPagination } from "./AdminPagination";

export interface AdminPayoutsTableProps {
  rows: AdminPayoutRow[];
  selectedId: string;
  onSelect: (row: AdminPayoutRow) => void;
  openDossier: (row: AdminPayoutRow) => void;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  loading?: boolean;
  emptyLabel: string;
}

/** Real clearing ledger — one aggregated settlement run per fleet operator. */
export const AdminPayoutsTable: React.FC<AdminPayoutsTableProps> = ({
  rows,
  selectedId,
  onSelect,
  openDossier,
  pagination,
  onPageChange,
  loading = false,
  emptyLabel,
}) => {
  const { t, i18n } = useTranslation();

  if (rows.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5EEFF] text-[#2563EB]">
          <Wallet className="h-7 w-7" />
        </div>
        <p className="mt-4 max-w-sm text-sm text-[#64748B]">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-[#565E74]">
          {t("admin.commissions.table.showingOf", {
            from: Math.min(pagination.total, (pagination.page - 1) * pagination.limit + 1),
            to: Math.min(pagination.total, pagination.page * pagination.limit),
            total: pagination.total,
          })}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#EFF4FF] px-2.5 py-1 text-[11px] font-semibold text-[#565E74]">
          {t("admin.commissions.table.activeRuns", { count: pagination.total })}
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#EFF4FF] text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              <th className="rounded-s-2xl px-4 py-3">{t("admin.commissions.table.payoutId")}</th>
              <th className="px-4 py-3">{t("admin.commissions.table.operator")}</th>
              <th className="px-4 py-3 text-center">{t("admin.commissions.table.bookings")}</th>
              <th className="px-4 py-3 text-right">{t("admin.commissions.table.gross")}</th>
              <th className="px-4 py-3 text-right">{t("admin.commissions.table.fee")}</th>
              <th className="px-4 py-3 text-right">{t("admin.commissions.table.net")}</th>
              <th className="px-4 py-3 text-right">{t("admin.commissions.table.pending")}</th>
              <th className="px-4 py-3">{t("admin.commissions.table.lastSettlement")}</th>
              <th className="px-4 py-3">{t("admin.commissions.table.status")}</th>
              <th className="rounded-e-2xl px-4 py-3 text-right">
                {t("admin.commissions.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.map((row) => {
              const code = payoutCodeOf(row);
              const selected = row.companyId === selectedId;
              const rate = row.company?.customCommissionRate ?? effectiveRateOf(row);
              const pending = row.unsettled + row.processing;
              const last = row.lastPayoutSetAt ?? row.lastPaidAt;

              return (
                <tr
                  key={row.companyId ?? code}
                  onClick={() => onSelect(row)}
                  className={`cursor-pointer border-b border-slate-100 transition-colors last:border-0 ${
                    selected
                      ? "bg-[#EFF4FF]/80"
                      : pending > 0 && !last
                        ? "bg-amber-50/40 hover:bg-amber-50/70"
                        : "hover:bg-[#EFF4FF]/40"
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <div className="min-w-[130px]">
                      <span className="font-mono text-[12px] font-bold text-[#2563EB]">
                        {code}
                      </span>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#565E74]">
                        {row.bookings > 0 && !last ? (
                          <>
                            <MoreHorizontal className="h-3 w-3 text-amber-500" />
                            {t("admin.commissions.dossier.pendingBadge")}
                          </>
                        ) : last ? (
                          <>
                            <CircleCheck className="h-3 w-3 text-emerald-500" />
                            {t("admin.commissions.table.viewDossier")}
                          </>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex min-w-[180px] items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E5EEFF] text-xs font-bold text-[#2563EB]">
                        {(row.company?.name ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-bold text-[#0B1C30]">
                          {row.company?.name ?? t("admin.payments.table.unknown")}
                        </div>
                        <div className="truncate text-xs text-[#565E74]">
                          {row.company?.city ?? ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center rounded-lg bg-[#EFF4FF] px-2 py-0.5 text-xs font-bold text-[#0B1C30]">
                      {row.bookings}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="whitespace-nowrap text-[13px] font-extrabold text-[#0B1C30]">
                      {formatLYD(row.gross)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="whitespace-nowrap text-[13px] font-bold text-[#2563EB]">
                      -{formatLYD(row.fee)}
                    </div>
                    <div className="text-[10px] text-[#565E74]">
                      {t("admin.commissions.table.pctFee", { rate: rate.toFixed(1) })}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="whitespace-nowrap text-[13px] font-extrabold text-emerald-700">
                      {formatLYD(row.net)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {pending > 0 ? (
                      <span className="whitespace-nowrap text-[13px] font-bold text-amber-700">
                        {formatLYD(pending)}
                      </span>
                    ) : (
                      <span className="text-xs text-[#565E74]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {last ? (
                      <div className="min-w-[130px] text-xs font-semibold text-[#0B1C30]">
                        {formatDate(last, i18n.language)}
                      </div>
                    ) : (
                      <div className="flex min-w-[130px] items-center gap-1 text-xs text-[#565E74]">
                        <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
                        {t("admin.commissions.kpis.batchScheduled")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <PayoutStatusChip status={row.payoutStatus} />
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openDossier(row)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                          selected
                            ? "bg-[#2563EB] text-white shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
                            : "bg-[#EFF4FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          {selected
                            ? t("admin.commissions.table.viewDossier")
                            : t("admin.commissions.table.review")}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelect(row)}
                        className="rounded-lg p-1 text-[#565E74] transition-colors hover:bg-[#EFF4FF] hover:text-[#0B1C30] cursor-pointer"
                        aria-label={t("admin.commissions.table.actions")}
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-[#565E74]">
        {t("admin.commissions.table.currencyLabel")} {t("admin.commissions.table.currency")}
      </div>
      <AdminPagination
        pagination={pagination}
        onPageChange={onPageChange}
        shownCount={rows.length}
        loading={loading}
      />
    </div>
  );
};

export default AdminPayoutsTable;