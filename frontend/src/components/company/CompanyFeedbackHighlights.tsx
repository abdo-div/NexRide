import React from "react";
import { useTranslation } from "react-i18next";
import { Lightbulb, ThumbsUp, TrendingDown } from "lucide-react";
import { ComingSoonBadge } from "./CompanySettingsSection";

/**
 * The design's keyword/sentiment highlights have no sentiment pipeline yet, so
 * the panel is parked as coming soon rather than showing fabricated phrases.
 */
export const CompanyFeedbackHighlights: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[18px] font-bold text-[#0B1C30]">
            {t("company.reviewsPage.highlights.title")}
          </h2>
          <p className="text-[12px] font-semibold text-[#565E74]">
            {t("company.reviewsPage.highlights.titleAr")}
          </p>
        </div>
        <ComingSoonBadge />
      </header>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-dashed border-slate-200 bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <ThumbsUp className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-[13px] font-bold text-[#0B1C30]">
              {t("company.reviewsPage.highlights.positive")}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-2.5 w-full rounded-full bg-[#E9EEF5]"
                style={{ width: `${82 - index * 18}%` }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-slate-200 bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFE4E5] text-[#BA1A1A]">
              <TrendingDown className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-[13px] font-bold text-[#0B1C30]">
              {t("company.reviewsPage.highlights.improvements")}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-2.5 w-full rounded-full bg-[#E9EEF5]"
                style={{ width: `${64 - index * 15}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[12px] text-[#9AA4B5]">
        <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
        {t("company.reviewsPage.highlights.soon")}
      </p>
    </section>
  );
};

export default CompanyFeedbackHighlights;