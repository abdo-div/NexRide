import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "../../types/admin";

export interface AdminPaginationProps {
  /** Server-resolved pagination block from the listing response. */
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  /** Rows currently rendered, used for the "showing X of Y" caption. */
  shownCount: number;
  /** Set while a new page is in flight so the controls can lock. */
  loading?: boolean;
}

/**
 * Builds a compact window of page numbers around the current page.
 *
 * A full 1..N list is unusable once a ledger grows, so the control always shows
 * the first and last page plus a sliding window around the current page. The
 * page numbers are computed from the server's `totalPages`, so navigation never
 * has to guess how many pages exist.
 */
const pageWindow = (
  current: number,
  totalPages: number,
): Array<number | "gap"> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages]);
  // Two neighbours on each side keeps the "where am I" context visible.
  for (let offset = -2; offset <= 2; offset += 1) {
    const page = current + offset;
    if (page > 1 && page < totalPages) pages.add(page);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const withGaps: Array<number | "gap"> = [];

  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) withGaps.push("gap");
    withGaps.push(page);
  });

  return withGaps;
};

/**
 * The single pagination control shared by every admin listing.
 *
 * It renders server-reported metadata (page, limit, total, totalPages and the
 * navigation flags) rather than deriving anything from the rows on screen, so a
 * table can never disagree with the backend about how much data exists.
 */
export const AdminPagination: React.FC<AdminPaginationProps> = ({
  pagination,
  onPageChange,
  shownCount,
  loading = false,
}) => {
  const { t } = useTranslation();

  const { page, limit, total, totalPages } = pagination;

  const pages = useMemo(() => pageWindow(page, totalPages), [page, totalPages]);

  // An empty result set hides the control entirely rather than showing "1 of 0".
  if (total === 0) return null;

  const canGoBack = !loading && page > 1;
  const canGoForward = !loading && page < totalPages;

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-[#565E74] sm:flex-row">
      <div>
        {t("admin.pagination.showingOf", {
          shown: shownCount,
          total,
          from: (page - 1) * limit + 1,
          to: Math.min(page * limit, total),
        })}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={() => onPageChange(page - 1)}
          className="flex items-center gap-1 rounded-lg bg-[#EFF4FF] px-3 py-1.5 font-semibold text-[#565E74] transition-colors enabled:hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <ChevronRight className="h-4 w-4 rtl:hidden" />
          <ChevronLeft className="hidden h-4 w-4 rtl:block" />
          {t("admin.pagination.prev")}
        </button>

        {pages.map((entry, index) =>
          entry === "gap" ? (
            <span
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-1 text-[#94A3B8]"
            >
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              disabled={loading}
              onClick={() => onPageChange(entry)}
              aria-current={entry === page ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors cursor-pointer ${
                entry === page
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "bg-[#EFF4FF] text-[#565E74] hover:bg-[#E5EEFF]"
              }`}
            >
              {entry}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={!canGoForward}
          onClick={() => onPageChange(page + 1)}
          className="flex items-center gap-1 rounded-lg bg-[#EFF4FF] px-3 py-1.5 font-semibold text-[#565E74] transition-colors enabled:hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          {t("admin.pagination.next")}
          <ChevronLeft className="h-4 w-4 rtl:hidden" />
          <ChevronRight className="hidden h-4 w-4 rtl:block" />
        </button>
      </div>
    </div>
  );
};

export default AdminPagination;
