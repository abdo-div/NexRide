import React, { useEffect, useState } from "react";
import { Building2, CheckCircle2, LockKeyhole, MessageSquareText, Send, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { vehicleApi, type ReviewEligibility } from "../../lib/vehicleApi";
import type { BookingDto } from "../../types/booking";

const idOf = (value: BookingDto["vehicleId"]) =>
  typeof value === "string" ? value : value._id;

export const BookingReviewCard: React.FC<{
  booking: BookingDto;
  onNotice: (message: string) => void;
}> = ({ booking, onNotice }) => {
  const { t, i18n } = useTranslation();
  const vehicleId = idOf(booking.vehicleId);
  const [state, setState] = useState<ReviewEligibility | null>(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (booking.bookingStatus !== "COMPLETED") {
      return;
    }
    const controller = new AbortController();
    vehicleApi
      .reviewEligibility(vehicleId, booking._id, controller.signal)
      .then((response) => setState(response.data.eligibility))
      .catch(() => setError(t("bookingDetails.review.loadError")));
    return () => controller.abort();
  }, [booking._id, booking.bookingStatus, t, vehicleId]);

  const loading =
    booking.bookingStatus === "COMPLETED" && state === null && !error;

  const submit = async () => {
    if (rating < 1 || review.trim().length < 10) {
      setError(t("bookingDetails.review.validation"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await vehicleApi.createReview(vehicleId, rating, review.trim());
      setState((current) =>
        current
          ? { ...current, eligible: false, reviewed: true, review: response.data.review }
          : current,
      );
      onNotice(t("bookingDetails.review.success"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("bookingDetails.review.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[#DCE4EF] bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#0B1C30] to-[#18375D] px-6 py-5 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <MessageSquareText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold">{t("bookingDetails.review.title")}</h2>
            <p className="mt-0.5 text-xs font-medium text-white/70">
              {t("bookingDetails.review.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {booking.bookingStatus !== "COMPLETED" ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:flex-row sm:items-center">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#142B4A] shadow-sm">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-[#0B1C30]">
                {t("bookingDetails.review.lockedTitle")}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {t("bookingDetails.review.lockedBody")}
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
        ) : state?.reviewed ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-800">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              {t("bookingDetails.review.submitted")}
            </div>
            <div className="mt-3 flex gap-1 text-amber-500">
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  className={`h-5 w-5 ${index < (state.review?.rating ?? 0) ? "fill-current" : "text-slate-300"}`}
                />
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{state.review?.review}</p>
            <p className="mt-3 text-xs font-semibold text-emerald-700">
              {t("bookingDetails.review.visible")}
            </p>
            {state.review?.companyResponse?.response ? (
              <div className="mt-5 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-extrabold text-[#142B4A]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {t("bookingDetails.review.companyReply")}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {state.review.companyResponse.response}
                </p>
                {state.review.companyResponse.respondedAt ? (
                  <p className="mt-2 text-xs font-medium text-slate-400">
                    {new Intl.DateTimeFormat(i18n.language === "ar" ? "ar-LY" : "en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }).format(new Date(state.review.companyResponse.respondedAt))}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-xs font-semibold text-slate-500">
                {t("bookingDetails.review.awaitingCompanyReply")}
              </p>
            )}
          </div>
        ) : state?.eligible ? (
          <>
            <fieldset>
              <legend className="text-sm font-bold text-slate-900">
                {t("bookingDetails.review.ratingLabel")}
              </legend>
              <div className="mt-3 flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
                {Array.from({ length: 5 }, (_, index) => {
                  const value = index + 1;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-label={t("bookingDetails.review.starLabel", { count: value })}
                      onMouseEnter={() => setHovered(value)}
                      onFocus={() => setHovered(value)}
                      onClick={() => setRating(value)}
                      className="rounded-lg p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          value <= (hovered || rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300"
                        }`}
                      />
                    </button>
                  );
                })}
                {rating > 0 ? (
                  <span className="ms-2 text-sm font-bold text-slate-700">
                    {t("bookingDetails.review.ratingValue", { count: rating })}
                  </span>
                ) : null}
              </div>
            </fieldset>

            <label className="mt-5 block text-sm font-bold text-slate-900" htmlFor="booking-review">
              {t("bookingDetails.review.commentLabel")}
            </label>
            <textarea
              id="booking-review"
              value={review}
              maxLength={1000}
              rows={5}
              onChange={(event) => {
                setReview(event.target.value);
                setError("");
              }}
              placeholder={t("bookingDetails.review.placeholder")}
              className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-slate-500">
                {t("bookingDetails.review.verifiedNote")}
              </p>
              <span className="text-xs font-semibold text-slate-400">{review.length}/1000</span>
            </div>
            {error ? <p className="mt-3 text-sm font-semibold text-red-600" role="alert">{error}</p> : null}
            <button
              type="button"
              disabled={saving || rating < 1 || review.trim().length < 10}
              onClick={() => void submit()}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#142B4A] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0D2039] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {saving ? t("bookingDetails.review.saving") : t("bookingDetails.review.submit")}
            </button>
          </>
        ) : (
          <p className="text-sm font-medium text-slate-600">
            {error || t("bookingDetails.review.unavailable")}
          </p>
        )}
      </div>
    </section>
  );
};

export default BookingReviewCard;
