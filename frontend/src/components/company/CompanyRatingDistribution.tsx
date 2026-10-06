import React from "react";
import { useTranslation } from "react-i18next";
import { Star, ThumbsUp } from "lucide-react";
import type { CompanyReviewDistributionDatum } from "../../types/companyReviews";

interface CompanyRatingDistributionProps {
  distribution: CompanyReviewDistributionDatum[];
  total: number;
  lang: string;
}

const starsLabel = (t: (key: string, opts?: Record<string, unknown>) => string, stars: number): string =>
  stars === 1
    ? t("company.reviewsPage.distribution.stars", { stars })
    : t("company.reviewsPage.distribution.starsPlural", { stars });

/**
 * Rating distribution across the tenant's reviews: count + share per star,
 * the recommend-us rate (4–5 stars) and the load timestamp. All percentages
 * are recomputed from the real distribution, never fixed.
 */
export const CompanyRatingDistribution: React.FC<CompanyRatingDistributionProps> = ({
  distribution,
  total,
  lang,
}) => {
  const { t } = useTranslation();

  const recommendCount = distribution
    .filter((d) => d.stars >= 4)
    .reduce((sum, d) => sum + d.count, 0);
  const recommendPct =
    total > 0 ? Math.round((recommendCount / total) * 100) : 0;

  const updatedAt = new Intl.DateTimeFormat(lang, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[18px] font-bold text-[#0B1C30]">
            {t("company.reviewsPage.distribution.title")}
          </h2>
          <p className="text-[12px] font-semibold text-[#565E74]">
            {t("company.reviewsPage.distribution.titleAr")}
          </p>
        </div>
        <span className="text-[11px] font-semibold text-[#9AA4B5]">
          {t("company.reviewsPage.distribution.updatedAt", { time: updatedAt })}
        </span>
      </header>

      {total === 0 ? (
        <p className="mt-6 text-sm text-[#64748B]">
          {t("company.reviewsPage.distribution.empty")}
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-[1fr_200px]">
          <div className="space-y-3">
            {distribution.map((datum) => (
              <div key={datum.stars} className="flex items-center gap-3">
                <div className="flex w-16 shrink-0 items-center gap-1 text-[#F59E0B]">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                  <span className="text-[13px] font-bold text-[#0B1C30]">
                    {starsLabel(t, datum.stars)}
                  </span>
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]">
                  <div
                    className="h-full rounded-full bg-[#2563EB] transition-all"
                    style={{ width: `${datum.percent}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-end text-[13px] font-bold text-[#0B1C30]">
                  {datum.count}
                </span>
                <span className="w-12 shrink-0 text-end text-[11px] font-semibold text-[#9AA4B5]">
                  {datum.percent}%
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-center gap-2 rounded-xl bg-[#F8FAFC] p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
              {t("company.reviewsPage.distribution.total", { count: total })}
            </span>
            <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-bold text-emerald-700">
              <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
              {t("company.reviewsPage.distribution.recommend")} · {recommendPct}%
            </div>
            <p className="text-[12px] leading-relaxed text-[#64748B]">
              {[5, 4].map((stars) => starsLabel(t, stars)).join(" + ")} reviews count
              toward your recommendation rate.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default CompanyRatingDistribution;