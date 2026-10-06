import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "../../types/admin";

interface CompanyFleetPaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

const pageButton = (active: boolean) =>
  `h-9 min-w-9 rounded-lg px-2 text-sm font-semibold transition-colors cursor-pointer ${
    active
      ? "bg-[#2563EB] text-white shadow-sm"
      : "text-[#565E74] hover:bg-[#F7F9FC]"
  }`;

/** Page numbers + prev/next with the "Showing X–Y of Z vehicles" summary. */
export const CompanyFleetPagination: React.FC<CompanyFleetPaginationProps> = ({
  pagination,
  onPageChange,
}) => {
  const { t } = useTranslation();
  const { page, totalPages, hasNextPage, hasPreviousPage, total } = pagination;

  const from = total === 0 ? 0 : (page - 1) * 7 + 1;
  const to = Math.min(page * 7, total);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-medium text-[#565E74]">
        {t("company.fleetPage.pagination.showing", { from, to, total })}{" "}
        <span className="text-[#9AA4B5]">
          ({t("company.fleetPage.pagination.vehicles")})
        </span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#565E74] transition-colors hover:bg-[#F7F9FC] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          aria-label={t("company.fleetPage.pagination.previous")}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={pageButton(p === page)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#565E74] transition-colors hover:bg-[#F7F9FC] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          aria-label={t("company.fleetPage.pagination.next")}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default CompanyFleetPagination;