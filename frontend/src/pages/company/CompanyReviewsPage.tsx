import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";
import { useCompanyReviews } from "../../hooks/useCompanyReviews";
import { saveBlobAsFile } from "../../lib/bookingView";
import type { CompanyReviewsData } from "../../types/companyReviews";
import { CompanyReviewsHeader } from "../../components/company/CompanyReviewsHeader";
import type { CompanyReviewView } from "../../components/company/CompanyReviewsHeader";
import { CompanyReviewKpiCards } from "../../components/company/CompanyReviewKpiCards";
import { CompanyRatingDistribution } from "../../components/company/CompanyRatingDistribution";
import { CompanyAspectScores } from "../../components/company/CompanyAspectScores";
import { CompanyRatingTrend } from "../../components/company/CompanyRatingTrend";
import { CompanyFeedbackHighlights } from "../../components/company/CompanyFeedbackHighlights";
import { CompanyFleetLeaderboard } from "../../components/company/CompanyFleetLeaderboard";
import { CompanyReviewsToolbar } from "../../components/company/CompanyReviewsToolbar";
import { CompanyReviewsTable } from "../../components/company/CompanyReviewsTable";

const csv = (data: CompanyReviewsData): string => {
  const header = [
    "ID",
    "Rating",
    "Reviewer",
    "Vehicle",
    "Booking",
    "Pickup Location",
    "Created At",
    "Review",
    "Status",
    "Company Response",
    "Responded At",
  ];
  const rows = data.list.map((row) => [
    row.id,
    String(row.rating),
    row.customer.name,
    row.vehicle
      ? `${row.vehicle.make} ${row.vehicle.model}${row.vehicle.year ? ` (${row.vehicle.year})` : ""}`
      : "",
    row.booking?.reference ?? "",
    row.booking?.pickupLocation ?? "",
    row.createdAt ?? "",
    `"${row.review.replace(/"/g, '""')}"`,
    row.companyResponse.responded ? "Responded" : "Awaiting",
    `"${(row.companyResponse.text ?? "").replace(/"/g, '""')}"`,
    row.companyResponse.respondedAt ?? "",
  ]);
  return [header, ...rows].join("\n");
};

/** Company Reviews & Ratings — analytics deck + All Ratings register. */
export const CompanyReviewsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    data,
    loading,
    error,
    reload,
    star,
    setStar,
    vehicleId,
    setVehicleId,
    status,
    setStatus,
    period,
    setPeriod,
    setPage,
    setLimit,
    resetFilters,
    replyingId,
    reply,
  } = useCompanyReviews();

  const [view, setView] = useState<CompanyReviewView>("detailed");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  };

  const lang = i18n.language;
  const { summary, distribution, trend, leaderboard, vehicles, list, pagination } = data;

  const hasActiveFilters =
    star !== "all" || vehicleId !== "" || status !== "all" || period !== "all";

  const handleExport = useCallback(() => {
    if (data.list.length === 0) return;
    saveBlobAsFile(
      new Blob([csv(data)], { type: "text/csv;charset=utf-8" }),
      `nexride-reviews-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }, [data]);

  const handleReply = useCallback(
    async (reviewId: string, text: string): Promise<boolean> => {
      const result = await reply(reviewId, text);
      showToast(
        result.ok
          ? t("company.reviewsPage.toasts.replySuccess")
          : result.message || t("company.reviewsPage.toasts.replyError"),
      );
      return result.ok;
    },
    [reply, t],
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      <div className="flex flex-col gap-6">
        <CompanyReviewsHeader
          company={data.company ?? null}
          loading={loading}
          canExport={list.length > 0}
          onExport={handleExport}
          view={view}
          onViewChange={setView}
        />

        <CompanyReviewKpiCards summary={summary} lang={lang} />

        {error ? (
          <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
            <Activity className="h-10 w-10 text-[#94A3B8]" />
            <p className="mt-4 max-w-md text-sm text-[#64748B]">
              {t("company.reviewsPage.states.loadError")}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
            >
              {t("company.reviewsPage.states.retry")}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
              <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
                <CompanyRatingDistribution
                  distribution={distribution}
                  total={summary.total}
                  lang={lang}
                />
                <CompanyAspectScores />
                <CompanyRatingTrend trend={trend} lang={lang} total={summary.total} />
                <CompanyFeedbackHighlights />
              </div>
              <div className="lg:col-span-1">
                <CompanyFleetLeaderboard leaderboard={leaderboard} lang={lang} loading={loading} />
              </div>
            </div>

            {/* All Ratings register */}
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[20px] font-bold text-[#0B1C30]">
                      {t("company.reviewsPage.register.title")}
                    </h2>
                    <span className="text-base font-semibold text-[#565E74]">
                      {t("company.reviewsPage.register.titleAr")}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#565E74]">
                    {t("company.reviewsPage.register.subtitle")}
                  </p>
                </div>
              </div>

              <CompanyReviewsToolbar
                star={star}
                onStarChange={setStar}
                vehicleId={vehicleId}
                onVehicleChange={setVehicleId}
                vehicles={vehicles}
                status={status}
                onStatusChange={setStatus}
                period={period}
                onPeriodChange={setPeriod}
                onClear={resetFilters}
              />

              {loading && list.length === 0 ? (
                <div className="space-y-3">
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#E5EEFF]" />
                  <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                </div>
              ) : error ? (
                <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
                  <Activity className="h-10 w-10 text-[#94A3B8]" />
                  <p className="mt-4 max-w-md text-sm text-[#64748B]">
                    {t("company.reviewsPage.states.loadError")}
                  </p>
                  <button
                    type="button"
                    onClick={reload}
                    className="mt-4 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
                  >
                    {t("company.reviewsPage.states.retry")}
                  </button>
                </div>
              ) : (
                <CompanyReviewsTable
                  rows={list}
                  view={view}
                  lang={lang}
                  companyName={data.company?.name ?? ""}
                  replyingId={replyingId}
                  onReply={handleReply}
                  hasActiveFilters={hasActiveFilters}
                  pagination={pagination}
                  onPageChange={setPage}
                  onLimitChange={setLimit}
                />
              )}
            </section>
          </>
        )}
      </div>

      {/* Local toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#0B1C30] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(8,19,31,0.35)]">
          {toast}
        </div>
      )}
    </div>
  );
};

export default CompanyReviewsPage;