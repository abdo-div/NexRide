import React from "react";
import { useTranslation } from "react-i18next";
import {
  MessageSquareText,
  Star,
  StarHalf,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { CompanyReviewSummary } from "../../types/companyReviews";

interface DeltaPillProps {
  display: string;
  positive: boolean;
}

/** Signed change pill: emerald when holding/rising, red when slipping. */
const DeltaPill: React.FC<DeltaPillProps> = ({ display, positive }) => {
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        positive ? "bg-emerald-50 text-emerald-700" : "bg-[#FFDBE0] text-[#BA1A1A]"
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {display}
    </span>
  );
};

/** Five stars derived from the real average, rounded to the nearest half. */
const StarRow: React.FC<{ rating: number | null }> = ({ rating }) => {
  const value = rating ?? 0;
  const nearestHalf = Math.round(value * 2) / 2;
  return (
    <div className="flex items-center gap-0.5 text-amber-500">
      {[0, 1, 2, 3, 4].map((index) => {
        const filled = nearestHalf >= index + 1;
        const half = !filled && nearestHalf >= index + 0.5;
        if (half) {
          return (
            <StarHalf
              key={index}
              className="h-[18px] w-[18px] fill-amber-500 text-amber-500"
              aria-hidden="true"
            />
          );
        }
        return (
          <Star
            key={index}
            className={`h-[18px] w-[18px] ${
              filled ? "fill-amber-500 text-amber-500" : "text-amber-200"
            }`}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
};

const formatSigned = (value: number): string =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

interface CompanyReviewKpiCardsProps {
  summary: CompanyReviewSummary;
  lang: string;
}

/**
 * The 4-card KPI deck, generated entirely from the tenant's real reviews:
 * overall rating (with a month-over-month delta from the trend), total reviews
 * across the reviewed fleet, current-month activity, and the response rate
 * including fleet average response time.
 */
export const CompanyReviewKpiCards: React.FC<CompanyReviewKpiCardsProps> = ({
  summary,
  lang,
}) => {
  const { t } = useTranslation();
  const now = new Intl.DateTimeFormat(lang, {
    month: "long",
    year: "numeric",
  }).format(new Date());

  const basedOn =
    summary.total === 1
      ? t("company.reviewsPage.kpis.basedOnOne")
      : t("company.reviewsPage.kpis.basedOn", { count: summary.total });

  const acrossVehicles =
    summary.vehicles === 1
      ? t("company.reviewsPage.kpis.verifiedAcrossOne")
      : t("company.reviewsPage.kpis.verifiedAcross", { count: summary.vehicles });

  const inMonth =
    summary.thisMonth === 1
      ? t("company.reviewsPage.kpis.inMonthOne", { date: now })
      : t("company.reviewsPage.kpis.inMonth", { count: summary.thisMonth, date: now });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Overall Rating */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-[#E5EEFF]/60 blur-2xl" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
            {t("company.reviewsPage.kpis.overall")}
          </span>
          {summary.avgDelta !== null && (
            <DeltaPill
              display={formatSigned(summary.avgDelta)}
              positive={summary.avgDelta >= 0}
            />
          )}
        </div>
        <div className="my-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[38px] font-extrabold leading-none tracking-tight text-[#0B1C30]">
              {summary.avg ?? "—"}
            </span>
            <span className="text-[15px] font-semibold text-[#565E74]">/ 5.0</span>
          </div>
          <div className="mt-1.5">
            <StarRow rating={summary.avg} />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-semibold text-[#64748B]">{basedOn}</span>
          {summary.avgDelta !== null && (
            <span className="text-[11px] text-[#9AA4B5]">
              {t("company.reviewsPage.kpis.deltaLabel")}
            </span>
          )}
        </div>
      </div>

      {/* Total Reviews */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
            {t("company.reviewsPage.kpis.total")}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E5EEFF] text-[#2563EB]">
            <MessageSquareText className="h-[18px] w-[18px]" aria-hidden="true" />
          </div>
        </div>
        <div className="my-3">
          <span className="text-[38px] font-extrabold leading-none tracking-tight text-[#0B1C30]">
            {summary.total}
          </span>
        </div>
        <span className="text-[12px] font-semibold text-[#64748B]">{acrossVehicles}</span>
      </div>

      {/* Monthly Activity */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
            {t("company.reviewsPage.kpis.activity")}
          </span>
          {summary.monthChangePct !== null && (
            <DeltaPill
              display={`${summary.monthChangePct > 0 ? "+" : ""}${summary.monthChangePct}%`}
              positive={summary.monthChangePct >= 0}
            />
          )}
        </div>
        <div className="my-3">
          <span className="text-[38px] font-extrabold leading-none tracking-tight text-[#0B1C30]">
            {summary.thisMonth}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-semibold text-[#64748B]">{inMonth}</span>
          {summary.monthChangePct !== null && (
            <span className="text-[11px] text-[#9AA4B5]">
              {t("company.reviewsPage.kpis.deltaLabel")}
            </span>
          )}
        </div>
      </div>

      {/* Response Rate */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
            {t("company.reviewsPage.kpis.response")}
          </span>
        </div>
        <div className="my-3">
          <span className="text-[38px] font-extrabold leading-none tracking-tight text-[#0B1C30]">
            {summary.responseRatePct !== null ? `${summary.responseRatePct}%` : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          {summary.avgResponseHours !== null && (
            <span className="text-[12px] font-semibold text-[#64748B]">
              {t("company.reviewsPage.kpis.avgResponse", {
                hours: summary.avgResponseHours,
              })}
            </span>
          )}
          <span className="text-[11px] text-[#9AA4B5]">
            {summary.total > 0
              ? t("company.reviewsPage.kpis.answered", {
                  responded: summary.responded,
                  total: summary.total,
                })
              : t("company.reviewsPage.kpis.noReviews")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CompanyReviewKpiCards;