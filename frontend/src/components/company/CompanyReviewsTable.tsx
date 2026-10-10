import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Reply,
  SearchX,
  Send,
  Star,
} from "lucide-react";
import type { PaginationMeta } from "../../types/admin";
import type { CompanyReviewRow } from "../../types/companyReviews";
import type { CompanyReviewView } from "./CompanyReviewsHeader";
import { timeAgo } from "../../lib/companyView";

const LIMIT_OPTIONS = [8, 10, 25, 50];

const MINI_STARS = [0, 1, 2, 3, 4];

interface MiniStarsProps {
  rating: number;
  small?: boolean;
}

const MiniStars: React.FC<MiniStarsProps> = ({ rating, small = false }) => (
  <span className="flex items-center gap-0.5 text-amber-500">
    {MINI_STARS.map((index) => (
      <Star
        key={index}
        className={`${small ? "h-3 w-3" : "h-3.5 w-3.5"} ${
          rating >= index + 1 ? "fill-amber-500 text-amber-500" : "text-amber-200"
        }`}
        aria-hidden="true"
      />
    ))}
  </span>
);

const StatusChip: React.FC<{ responded: boolean }> = ({ responded }) => {
  const { t } = useTranslation();
  return responded ? (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {t("company.reviewsPage.rows.responded")}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-[#FFF4E5] px-2.5 py-1 text-[11px] font-bold text-[#B45309]">
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
      {t("company.reviewsPage.rows.awaiting")}
    </span>
  );
};

const formatExactDate = (iso: string, lang: string): string =>
  new Intl.DateTimeFormat(lang, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));

const awaitingHours = (iso: string): number | null => {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  return hours >= 1 ? Math.min(hours, 72) : null;
};

interface ReplyFormProps {
  reviewId: string;
  draft: string;
  onDraftChange: (reviewId: string, text: string) => void;
  onSubmit: () => Promise<void>;
  busy: boolean;
  companyName: string;
  autoFocus?: boolean;
}

const ReplyForm: React.FC<ReplyFormProps> = ({
  reviewId,
  draft,
  onDraftChange,
  onSubmit,
  busy,
  companyName,
  autoFocus = false,
}) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-[#E5EEFF] bg-[#F8FAFF] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#2563EB]">
        <Reply className="h-3.5 w-3.5" aria-hidden="true" />
        {t("company.reviewsPage.rows.replyAs", { company: companyName })}
      </p>
      <textarea
        value={draft}
        maxLength={1000}
        rows={3}
        autoFocus={autoFocus}
        disabled={busy}
        onChange={(event) => onDraftChange(reviewId, event.target.value)}
        placeholder={t("company.reviewsPage.rows.replyPlaceholder")}
        className="w-full resize-none rounded-lg border border-[#E5EEFF] bg-white px-3 py-2 text-sm text-[#0B1C30] outline-none transition-colors placeholder:text-[#9AA4B5] focus:border-[#2563EB] focus:ring-2 focus:ring-[#E5EEFF] disabled:opacity-60"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onDraftChange(reviewId, "")}
          className="rounded-lg bg-white px-3 py-1.5 text-[12px] font-bold text-[#565E74] shadow-sm transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {t("company.reviewsPage.rows.cancel")}
        </button>
        <button
          type="button"
          disabled={busy || draft.trim().length === 0}
          onClick={() => void onSubmit()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm transition-colors enabled:hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          {t("company.reviewsPage.rows.postResponse")}
        </button>
      </div>
    </div>
  );
};

const ReviewContextLine: React.FC<{ row: CompanyReviewRow }> = ({ row }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {row.vehicle && (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F1F5F9] px-2.5 py-1 text-[12px] font-bold text-[#0B1C30]">
          <Car className="h-3.5 w-3.5 text-[#565E74]" aria-hidden="true" />
          {row.vehicle.make} {row.vehicle.model}
          {row.vehicle.year ? ` (${row.vehicle.year})` : ""}
        </span>
      )}
      {row.booking?.reference && (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F1F5F9] px-2.5 py-1 text-[12px] font-semibold text-[#565E74]">
          <CalendarDays className="h-3.5 w-3.5 text-[#565E74]" aria-hidden="true" />
          {t("company.reviewsPage.rows.viewBooking", { reference: row.booking.reference })}
        </span>
      )}
      {row.booking?.pickupLocation && (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F1F5F9] px-2.5 py-1 text-[12px] font-semibold text-[#565E74]">
          <MapPin className="h-3.5 w-3.5 text-[#565E74]" aria-hidden="true" />
          {row.booking.pickupLocation}
        </span>
      )}
      {row.booking?.totalDays !== null && row.booking?.totalDays !== undefined && (
        <span className="inline-flex items-center rounded-lg bg-[#F1F5F9] px-2.5 py-1 text-[12px] font-semibold text-[#565E74]">
          {t("company.reviewsPage.rows.rental", { days: row.booking.totalDays })}
        </span>
      )}
      {row.booking?.pickupMethod === "DELIVERY" && (
        <span className="inline-flex items-center rounded-lg bg-[#EFF4FF] px-2.5 py-1 text-[12px] font-bold text-[#2563EB]">
          {t("company.reviewsPage.rows.delivery")}
        </span>
      )}
      {row.booking?.pickupMethod === "BRANCH_PICKUP" && (
        <span className="inline-flex items-center rounded-lg bg-[#EFF4FF] px-2.5 py-1 text-[12px] font-bold text-[#2563EB]">
          {t("company.reviewsPage.rows.branchPickup")}
        </span>
      )}
    </div>
  );
};

const PartnerResponseBubble: React.FC<{ row: CompanyReviewRow; lang: string }> = ({
  row,
  lang,
}) => {
  const { t } = useTranslation();
  if (!row.companyResponse.responded && !row.companyResponse.text) return null;
  return (
    <div className="rounded-xl bg-[#F8FAFC] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
          <Send className="h-3 w-3" aria-hidden="true" />
          {t("company.reviewsPage.rows.partnerReply")} · {row.vehicle?.make ?? t("company.reviewsPage.title")}
        </span>
        {row.companyResponse.respondedAt && (
          <time
            className="text-[11px] font-semibold text-[#9AA4B5]"
            dateTime={row.companyResponse.respondedAt}
          >
            {timeAgo(row.companyResponse.respondedAt, lang)}
          </time>
        )}
      </div>
      <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-[#434655]">
        {row.companyResponse.text ?? ""}
      </p>
    </div>
  );
};

interface AvatarProps {
  name: string;
  initials: string;
}

const Avatar: React.FC<AvatarProps> = ({ name, initials }) => (
  <span
    aria-hidden="true"
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E5EEFF] text-[13px] font-extrabold text-[#2563EB]"
  >
    {initials || name.charAt(0).toUpperCase() || "?"}
  </span>
);

interface CompanyReviewsTableProps {
  rows: CompanyReviewRow[];
  view: CompanyReviewView;
  lang: string;
  companyName: string;
  replyingId: string | null;
  onReply: (reviewId: string, text: string) => Promise<boolean>;
  hasActiveFilters: boolean;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

/**
 * The All Ratings register: detailed cards or compact rows for the current
 * page. Awaiting reviews get an inline, public reply form; posting slots into
 * the deck response-rate summary via the page reload. Pagination footer mirrors
 * the bookings table.
 */
export const CompanyReviewsTable: React.FC<CompanyReviewsTableProps> = ({
  rows,
  view,
  lang,
  companyName,
  replyingId,
  onReply,
  hasActiveFilters,
  pagination,
  onPageChange,
  onLimitChange,
}) => {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [expandedCompact, setExpandedCompact] = useState<string | null>(null);

  const setDraft = (reviewId: string, text: string) => {
    setDrafts((current) => ({ ...current, [reviewId]: text }));
  };

  const postReply = async (reviewId: string): Promise<void> => {
    const text = drafts[reviewId]?.trim() ?? "";
    if (text.length === 0) return;
    const ok = await onReply(reviewId, text);
    if (ok) {
      setDraft(reviewId, "");
      setExpandedCompact(null);
    }
  };

  const { page, totalPages, hasNextPage, hasPreviousPage, total } = pagination;
  const from = total === 0 ? 0 : (page - 1) * pagination.limit + 1;
  const to = Math.min(page * pagination.limit, total);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        {hasActiveFilters ? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF4FF]">
              <SearchX className="h-6 w-6 text-[#2563EB]" aria-hidden="true" />
            </div>
            <p className="text-[16px] font-bold text-[#0B1C30]">
              {t("company.reviewsPage.register.emptyFilter")}
            </p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF4FF]">
              <Star className="h-6 w-6 text-[#2563EB]" aria-hidden="true" />
            </div>
            <p className="text-[16px] font-bold text-[#0B1C30]">
              {t("company.reviewsPage.states.emptyTitle")}
            </p>
            <p className="max-w-md text-[13px] leading-relaxed text-[#64748B]">
              {t("company.reviewsPage.states.emptyBody")}
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      {view === "detailed" ? (
        <div className="space-y-4 p-4 sm:p-5">
          {rows.map((row) => {
            const busy = replyingId === row.id;
            return (
              <article key={row.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar name={row.customer.name} initials={row.customer.initials} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-[14px] font-bold text-[#0B1C30]">
                          {row.customer.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
                          <Star className="h-3 w-3 fill-current text-amber-500" aria-hidden="true" />
                          {/* Verified-rental tag */}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <MiniStars rating={row.rating} />
                        {row.createdAt && (
                          <span className="text-[12px] font-semibold text-[#9AA4B5]">
                            {formatExactDate(row.createdAt, lang)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <StatusChip responded={row.companyResponse.responded} />
                </div>

                <p className="mt-3 text-[14px] leading-relaxed text-[#434655]">
                  {row.review}
                </p>

                <div className="mt-3">
                  <ReviewContextLine row={row} />
                </div>

                <div className="mt-4">
                  {row.companyResponse.responded ? (
                    <PartnerResponseBubble row={row} lang={lang} />
                  ) : (
                    <ReplyForm
                      reviewId={row.id}
                      draft={drafts[row.id] ?? ""}
                      onDraftChange={setDraft}
                      onSubmit={() => postReply(row.id)}
                      busy={busy}
                      companyName={companyName}
                    />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <ul className="divide-y divide-[#F1F5F9]">
          {rows.map((row) => {
            const busy = replyingId === row.id;
            const awaiting = !row.companyResponse.responded;
            const expanded = expandedCompact === row.id;
            const hours = row.createdAt ? awaitingHours(row.createdAt) : null;
            return (
              <li key={row.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={row.customer.name} initials={row.customer.initials} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-bold text-[#0B1C30]">
                          {row.customer.name}
                        </span>
                        <MiniStars rating={row.rating} small />
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[#9AA4B5]">
                        {row.vehicle && (
                          <span>
                            {row.vehicle.make} {row.vehicle.model}
                          </span>
                        )}
                        {row.createdAt && (
                          <>
                            <span>·</span>
                            <time dateTime={row.createdAt}>{timeAgo(row.createdAt, lang)}</time>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {awaiting && hours !== null && (
                      <span className="hidden text-[11px] font-semibold text-[#B45309] sm:inline">
                        {t("company.reviewsPage.rows.awaitingSince", { hours })}
                      </span>
                    )}
                    <StatusChip responded={row.companyResponse.responded} />
                    {awaiting && (
                      <button
                        type="button"
                        onClick={() => setExpandedCompact(expanded ? null : row.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#EFF4FF] px-2.5 py-1.5 text-[11px] font-bold text-[#2563EB] transition-colors hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      >
                        <Reply className="h-3 w-3" aria-hidden="true" />
                        {t("company.reviewsPage.rows.postResponse")}
                      </button>
                    )}
                  </div>
                </div>
                {expanded && (
                  <div className="px-4 pb-4 sm:px-5">
                    <ReplyForm
                      reviewId={row.id}
                      draft={drafts[row.id] ?? ""}
                      onDraftChange={setDraft}
                      onSubmit={() => postReply(row.id)}
                      busy={busy}
                      companyName={companyName}
                      autoFocus
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination footer */}
      <div className="flex flex-col justify-between gap-3 border-t border-[#F1F5F9] px-4 py-3.5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-[13px] text-[#565E74]">
          <span>{t("company.reviewsPage.table.showingOf", { from, to, total })}</span>
          <select
            value={pagination.limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="cursor-pointer rounded-md border border-[#E5EEFF] bg-white px-2 py-1 text-[12px] font-semibold text-[#0B1C30] outline-none focus:border-[#2563EB]"
          >
            {LIMIT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t("company.reviewsPage.table.perPage", { count: option })}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!hasPreviousPage}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#565E74] transition-colors hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            aria-label={t("company.reviewsPage.table.prev")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          {Array.from({ length: Math.max(totalPages, 1) }, (_, index) => index + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<number[]>((acc, p) => {
              const last = acc[acc.length - 1];
              if (last !== undefined && p - last > 1) acc.push(NaN);
              acc.push(p);
              return acc;
            }, [])
            .map((p, index) =>
              Number.isNaN(p) ? (
                <span key={`ellipsis-${index}`} className="px-1 text-[13px] text-[#9AA4B5]">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`h-8 min-w-8 rounded-lg px-2 text-[13px] font-bold transition-colors cursor-pointer ${
                    p === page ? "bg-[#2563EB] text-white" : "bg-[#EFF4FF] text-[#565E74] hover:bg-[#E5EEFF]"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
          <button
            type="button"
            disabled={!hasNextPage}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF4FF] text-[#565E74] transition-colors hover:bg-[#E5EEFF] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            aria-label={t("company.reviewsPage.table.next")}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyReviewsTable;