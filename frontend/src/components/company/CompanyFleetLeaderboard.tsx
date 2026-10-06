import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ArrowUpRight, Car, Crown, Star, Trophy } from "lucide-react";
import type { CompanyReviewLeaderboardRow } from "../../types/companyReviews";

interface CompanyFleetLeaderboardProps {
  leaderboard: CompanyReviewLeaderboardRow[];
  lang: string;
  loading: boolean;
}

const STAR_ROW = [0, 1, 2, 3, 4];

/** Right-side rail: the tenant's best-rated vehicles with a real positive % */
export const CompanyFleetLeaderboard: React.FC<CompanyFleetLeaderboardProps> = ({
  leaderboard,
  loading,
}) => {
  const { t } = useTranslation();

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
      <header className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFFCE8] text-[#F59E0B]">
          <Trophy className="h-[18px] w-[18px]" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-[16px] font-bold text-[#0B1C30]">
            {t("company.reviewsPage.leaderboard.title")}
          </h2>
          <p className="text-[11px] font-semibold text-[#565E74]">
            {t("company.reviewsPage.leaderboard.titleAr")}
          </p>
        </div>
      </header>

      <div className="mt-5 space-y-4">
        {loading && leaderboard.length === 0
          ? [0, 1, 2].map((index) => (
              <div key={index} className="animate-pulse space-y-2">
                <div className="h-3 w-2/3 rounded-full bg-[#EEF2F8]" />
                <div className="h-2 w-1/2 rounded-full bg-[#F4F7FB]" />
              </div>
            ))
          : leaderboard.length === 0
            ? (
              <div className="flex flex-col items-start gap-2 rounded-xl bg-[#F8FAFC] p-4">
                <Car className="h-5 w-5 text-[#9AA4B5]" aria-hidden="true" />
                <p className="text-[13px] font-semibold text-[#64748B]">
                  {t("company.reviewsPage.leaderboard.empty")}
                </p>
              </div>
            )
            : (
              <ol className="space-y-4">
                {leaderboard.map((row) => (
                  <li key={row.vehicle.id} className="flex items-start gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-extrabold ${
                        row.rank === 1
                          ? "bg-[#FFFCE8] text-[#B45309]"
                          : row.rank === 2
                            ? "bg-[#F1F5F9] text-[#64748B]"
                            : row.rank === 3
                              ? "bg-[#FFF7ED] text-[#C2410C]"
                              : "bg-[#F8FAFC] text-[#9AA4B5]"
                      }`}
                    >
                      {row.rank === 1 ? (
                        <Crown className="h-4 w-4" fill="currentColor" aria-hidden="true" />
                      ) : (
                        row.rank
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="truncate text-[13px] font-bold text-[#0B1C30]">
                          {row.vehicle.make} {row.vehicle.model}
                          {row.vehicle.year ? ` (${row.vehicle.year})` : ""}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                          {row.positivePct}%
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-0.5 text-amber-500">
                          {STAR_ROW.map((index) => (
                            <Star
                              key={index}
                              className={`h-3 w-3 ${
                                (row.avg ?? 0) >= index + 1
                                  ? "fill-amber-500 text-amber-500"
                                  : "text-amber-200"
                              }`}
                              aria-hidden="true"
                            />
                          ))}
                        </span>
                        <span className="text-[11px] font-semibold text-[#9AA4B5]">
                          {t("company.reviewsPage.leaderboard.positive", {
                            pct: row.positivePct,
                          })}
                          {" · "}
                          {t("company.reviewsPage.leaderboard.reviews", {
                            count: row.count,
                          })}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
      </div>

      <Link
        to="/company/fleet"
        className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[#EFF4FF] px-4 py-2.5 text-[13px] font-bold text-[#2563EB] transition-colors hover:bg-[#E5EEFF]"
      >
        {t("company.reviewsPage.leaderboard.manage")}
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </aside>
  );
};

export default CompanyFleetLeaderboard;